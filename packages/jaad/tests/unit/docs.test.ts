import type { DocsSource } from '../../src/docs/model/tree.ts'
import type { DocsUrlOptions } from '../../src/docs/urls.ts'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
    formatChapterTitle,
    getCleanSlug,
    getDocCollectionId,
    parseDocPath,
    slugToTitle,
    splitDocLocale,
} from '../../src/docs/model/ids.ts'
import { htmlText, pageDescription, pageHeadings } from '../../src/docs/model/rendered.ts'
import { buildDocsTree } from '../../src/docs/model/tree.ts'
import { validateDocsStructure } from '../../src/docs/model/validate.ts'
import { buildDocsNavigation } from '../../src/docs/navigation.ts'

/** A file of one locale; its path is its id unless given. */
const source = (id: string, more: Partial<DocsSource> = {}): DocsSource => ({ id, path: id, data: {}, ...more })

const treeOf = (sources: DocsSource[], urls: DocsUrlOptions = { docsBase: '/docs' }) => buildDocsTree(sources, { urls })

const ids = (sources: DocsSource[]) => treeOf(sources).pages.map((page) => page.id)

const navigationItems = (navigation: ReturnType<typeof buildDocsNavigation>) =>
    navigation.groups.flatMap((group) =>
        group.type === 'page' ? [group.item] : group.type === 'chapter' ? group.items : [],
    )

/** Rendered markdown from HTML, with Astro's headings read off it. */
const rendered = (html: string) => ({
    html,
    metadata: {
        headings: [...html.matchAll(/<h([1-6]) id="([^"]*)">(.*?)<\/h\1>/g)].map(([, depth, slug, text]) => ({
            depth: Number(depth),
            slug,
            text: htmlText(text),
        })),
    },
})

// ── Numeric prefixes: the ordering convention the whole product rests on ──────

test('a numeric prefix sets the order and is stripped from the slug', () => {
    assert.deepEqual(parseDocPath('01-introduction'), {
        slug: 'introduction',
        order: 1,
        chapter: undefined,
        orderChapter: undefined,
    })
})

test("a nested page carries both its chapter's order and its own", () => {
    assert.deepEqual(parseDocPath('02-guides/03-advanced'), {
        slug: 'advanced',
        order: 3,
        chapter: 'guides',
        orderChapter: 2,
    })
})

test('an unnumbered page sorts last', () => {
    assert.equal(parseDocPath('about').order, 999)
})

test('an unnumbered directory still names the chapter', () => {
    const parsed = parseDocPath('guides/01-intro')
    assert.equal(parsed.chapter, 'guides')
    assert.equal(parsed.orderChapter, undefined)
})

test('prefixes are stripped from every path segment', () => {
    assert.equal(getCleanSlug('02-guides/03-advanced'), 'guides/advanced')
    assert.equal(getCleanSlug('00-overview'), 'overview')
})

test('file paths use the same slug rules as the content collection', () => {
    assert.equal(getDocCollectionId('03-markdown/08-images-&-videos.md'), '03-markdown/08-images--videos')
    assert.equal(getDocCollectionId('03-markdown\\10-detail-&-summary.md'), '03-markdown/10-detail--summary')
})

// ── The tree: one resolution per page ────────────────────────────────────────

test('only the first page has an empty canonical slug', () => {
    const [first, second] = treeOf([source('01-intro'), source('02-guide')]).pages
    assert.equal(first.canonical, '')
    assert.deepEqual(first.aliases, ['intro'])
    assert.equal(second.canonical, 'guide')
    assert.deepEqual(second.aliases, [])
})

test('every page has its href, from the url options', () => {
    const sources = [source('01-intro'), source('02-guides/01-setup')]
    const hrefs = (urls: DocsUrlOptions) => treeOf(sources, urls).pages.map((page) => page.href)

    assert.deepEqual(hrefs({ docsBase: '/docs' }), ['/docs', '/docs/guides/setup'])
    // routeBase "/" is normalised to "" by the caller, so links stay single-slashed.
    assert.deepEqual(hrefs({ docsBase: '' }), ['/', '/guides/setup'])
    assert.deepEqual(hrefs({ docsBase: '/docs', deploymentBase: '/repo/' }), ['/repo/docs', '/repo/docs/guides/setup'])
})

test('pages are found by id and by translation key', () => {
    const tree = treeOf([source('01-a'), source('02-b', { data: { translationKey: 'setup' } })])
    assert.equal(tree.byId.get('02-b')?.index, 1)
    assert.equal(tree.byKey.get('setup')?.id, '02-b')
    assert.equal(tree.byKey.get('a')?.id, '01-a')
})

// ── Sorting ──────────────────────────────────────────────────────────────────

test('chapters sort by directory prefix, pages by their own within a chapter', () => {
    assert.deepEqual(
        ids([
            source('02-guides/02-second'),
            source('01-intro'),
            source('02-guides/01-first'),
            source('03-reference/01-api'),
        ]),
        ['01-intro', '02-guides/01-first', '02-guides/02-second', '03-reference/01-api'],
    )
})

test('a root page interleaves with chapters by its own number', () => {
    assert.deepEqual(ids([source('03-later'), source('02-guides/01-first'), source('01-first')]), [
        '01-first',
        '02-guides/01-first',
        '03-later',
    ])
})

test('frontmatter order re-sorts pages against their filenames', () => {
    assert.deepEqual(ids([source('01-first'), source('02-second', { data: { order: 99 } }), source('03-third')]), [
        '01-first',
        '03-third',
        '02-second',
    ])
})

test('inside a chapter, frontmatter order moves the page, not the chapter', () => {
    assert.deepEqual(ids([source('01-intro'), source('02-guides/05-a', { data: { order: 1 } }), source('03-end')]), [
        '01-intro',
        '02-guides/05-a',
        '03-end',
    ])
    assert.deepEqual(ids([source('02-guides/01-b'), source('02-guides/05-a', { data: { order: 0 } })]), [
        '02-guides/05-a',
        '02-guides/01-b',
    ])
})

test('an ordered page can take the opening route from the first file', () => {
    assert.equal(ids([source('01-intro'), source('02-welcome', { data: { order: 0 } })])[0], '02-welcome')
})

test('ordering and chapters read the path, without the locale', () => {
    const [page] = treeOf([source('it/02-guides/01-setup', { path: '02-guides/01-setup', locale: 'it' })]).pages
    assert.equal(page.chapter, 'guides')
    assert.equal(page.slug, 'guides/setup')
})

// ── Titles ───────────────────────────────────────────────────────────────────

test('slugs become titles, preserving separators the filesystem mangles', () => {
    assert.equal(slugToTitle('getting-started'), 'Getting Started')
    assert.equal(slugToTitle('images-&-videos'), 'Images & Videos')
    assert.equal(slugToTitle('detail_%26_summary'), 'Detail & Summary')
})

test('a chapter title is null when there is no chapter', () => {
    assert.equal(formatChapterTitle(undefined), null)
    assert.equal(formatChapterTitle('getting-started'), 'Getting Started')
})

test('frontmatter wins over the h1, which wins over the slug', () => {
    const h1 = rendered('<h1 id="from-the-body">From the <code>body</code></h1>')
    const [explicit, fromBody, fromSlug] = treeOf([
        source('01-a', { data: { title: 'Explicit' }, rendered: h1 }),
        source('02-b', { rendered: h1 }),
        source('03-getting-started'),
    ]).pages
    assert.equal(explicit.title, 'Explicit')
    assert.equal(fromBody.title, 'From the body')
    assert.equal(fromSlug.title, 'Getting Started')
})

test('a short label replaces the title in navigation only', () => {
    const [page] = treeOf([source('01-a', { data: { title: 'A Very Long Page Title', label: 'Short' } })]).pages
    assert.equal(page.title, 'A Very Long Page Title')
    assert.equal(page.label, 'Short')
})

// ── Structure ────────────────────────────────────────────────────────────────

test('a flat tree or one chapter level has an unambiguous structure', () => {
    assert.doesNotThrow(() => {
        validateDocsStructure([source('01-intro'), source('02-guides/01-setup'), source('02-guides/02-deploy')])
    })
})

test('duplicate clean slugs stop the build with both source ids', () => {
    assert.throws(
        () => {
            validateDocsStructure([source('01-guide'), source('02-guide')])
        },
        (error: Error) => {
            assert.match(error.message, /^jaad: invalid documentation structure\n/)
            assert.match(error.message, /01-guide, 02-guide all resolve to \/guide/)
            return true
        },
    )
})

test('ambiguous chapters and unsupported depth are reported together', () => {
    assert.throws(
        () => {
            validateDocsStructure([
                source('01-guides/01-start'),
                source('guides/02-next'),
                source('03-api/01-client/01-create'),
            ])
        },
        (error: Error) => {
            assert.match(error.message, /01-guides, guides all resolve to chapter \/guides/)
            assert.match(error.message, /03-api\/01-client\/01-create: only one chapter directory is supported/)
            return true
        },
    )
})

// Three segments are only legal because the locale is gone by the time the
// structure is checked.
test('a chaptered page inside a locale is a valid structure', () => {
    assert.doesNotThrow(() => {
        validateDocsStructure([source('it/02-guides/01-setup', { path: '02-guides/01-setup' })], 'it')
    })
})

test('a structure error names the file on disk, locale included', () => {
    assert.throws(() => {
        validateDocsStructure([source('it/a/b/c', { path: 'a/b/c' })], 'it')
    }, /it\/a\/b\/c: only one chapter directory/)
})

// ── Navigation ───────────────────────────────────────────────────────────────

test('the first nav item owns the docs root and later links use their slugs', () => {
    const tree = treeOf([source('01-intro'), source('02-guides/01-setup')])
    assert.deepEqual(
        navigationItems(buildDocsNavigation(tree, '01-intro')).map((item) => item.href),
        ['/docs', '/docs/guides/setup'],
    )
})

test('root pages and chapters interleave by number', () => {
    const tree = treeOf([
        source('01-intro'),
        source('02-guides/01-setup'),
        source('02-guides/02-deep'),
        source('03-changelog'),
    ])
    assert.deepEqual(
        buildDocsNavigation(tree, '01-intro').groups.map((group) =>
            group.type === 'page'
                ? group.item.title
                : group.type === 'chapter'
                  ? `${group.chapter}(${String(group.items.length)})`
                  : group.label,
        ),
        ['Intro', 'guides(2)', 'Changelog'],
    )
})

test('grouping keeps a chapter together', () => {
    const { groups } = buildDocsNavigation(treeOf([source('02-a/01-x'), source('02-a/02-y')]), '02-a/01-x')
    assert.equal(groups.length, 1)
    assert.equal(groups[0].type, 'chapter')
})

test('navigation derives active, previous and next pages together', () => {
    const navigation = buildDocsNavigation(
        treeOf([source('01-intro'), source('02-guide'), source('03-api')]),
        '02-guide',
    )
    assert.equal(navigation.previousPage?.title, 'Intro')
    assert.equal(navigation.nextPage?.title, 'Api')
    assert.equal(navigation.groups.filter((group) => group.type === 'page' && group.item.isActive).length, 1)
})

// ── The locale directory is split off before anything else reads the id ──────

test('a locale directory is split off the collection id', () => {
    assert.deepEqual(splitDocLocale('it/02-guides/01-setup', ['en', 'it']), {
        locale: 'it',
        id: '02-guides/01-setup',
    })
})

test('a directory that is not a configured locale is left in place', () => {
    assert.deepEqual(splitDocLocale('guides/01-setup', ['en', 'it']), { locale: null, id: 'guides/01-setup' })
    assert.deepEqual(splitDocLocale('it', ['en', 'it']), { locale: null, id: 'it' })
})

// ── Pairing translations ─────────────────────────────────────────────────────

// Without a key the slug decides, which is why two languages that translate
// their file names stop being linked.
test('the clean slug pairs translations until a key says otherwise', () => {
    const [plain, keyed] = treeOf([
        source('02-guides/01-setup'),
        source('02-guida/01-installazione', { data: { translationKey: 'setup' } }),
    ]).pages
    assert.equal(plain.translationKey, 'guides/setup')
    assert.equal(keyed.translationKey, 'setup')
})

test('two pages of one locale cannot claim the same translation', () => {
    assert.throws(() => {
        validateDocsStructure(
            [
                source('01-a', { data: { translationKey: 'setup' } }),
                source('02-b', { data: { translationKey: 'setup' } }),
            ],
            'it',
        )
    }, /it\/01-a, it\/02-b all claim translationKey setup/)
})

test('the same key in different locales is the point, not a clash', () => {
    assert.doesNotThrow(() => {
        validateDocsStructure([source('01-a', { data: { translationKey: 'setup' } })], 'it')
    })
})

// ── What the renderer produced ───────────────────────────────────────────────

test('only h2 and h3 reach the table of contents, with the renderer’s ids and text', () => {
    const headings = pageHeadings(
        rendered(
            '<h1 id="one">One</h1><h2 id="two">Two <code>it</code></h2><h3 id="three">Three</h3><h4 id="four">Four</h4>',
        ),
    )
    assert.deepEqual(
        headings.map((h) => [h.depth, h.slug, h.text]),
        [
            [2, 'two', 'Two it'],
            [3, 'three', 'Three'],
        ],
    )
})

test('headings inside a data-toc-ignore element stay out of the toc', () => {
    const headings = pageHeadings(
        rendered(
            [
                '<h2 id="setup">Setup</h2>',
                '<div data-toc-ignore class="demo">',
                '<h2 id="setup-1">Setup</h2>',
                '<div><h3 id="nested">Nested</h3></div>',
                '<img src="x.png">',
                '</div>',
                '<h2 id="setup-2">Setup</h2>',
            ].join('\n'),
        ),
    )
    assert.deepEqual(
        headings.map((h) => h.slug),
        ['setup', 'setup-2'],
    )
})

// Writing about the attribute is not using it.
test('data-toc-ignore in inline code ignores nothing', () => {
    const headings = pageHeadings(
        rendered('<p>Wrap headings in <code>&#x3C;div data-toc-ignore></code>.</p><h2 id="after">After</h2>'),
    )
    assert.deepEqual(
        headings.map((h) => h.slug),
        ['after'],
    )
})

test('text keeps prose and drops code, controls and icons', () => {
    assert.equal(
        htmlText(
            '<p><strong>bold</strong> and <em>it</em> &#x26; <code>code</code></p><pre><code>const secret = 1</code></pre>' +
                '<button>Copy</button><p>Look <img src="/x.png" alt="a diagram"> here.<svg><title>x</title></svg></p>',
        ),
        'bold and it & code Look here.',
    )
})

test('the description skips a first paragraph that only repeats the title', () => {
    assert.equal(
        pageDescription(rendered('<h1 id="t">Tables</h1><p>Tables</p><p>The real summary sentence.</p>'), 'Tables'),
        'The real summary sentence.',
    )
})

test('an alert title is not a description', () => {
    assert.equal(
        pageDescription(
            rendered(
                '<blockquote class="markdown-alert"><p class="markdown-alert-title">Note</p><p>Read this.</p></blockquote>',
            ),
            'T',
        ),
        'Read this.',
    )
})

test('a long description is cut at a word boundary', () => {
    const description = pageDescription(rendered(`<p>${'word '.repeat(60)}</p>`), 'T', 40) ?? ''
    assert.ok(description.length <= 41, description)
    assert.ok(description.endsWith('…'))
    assert.ok(!description.includes('wor…'))
})

test('no description when there is nothing but the title', () => {
    assert.equal(pageDescription(rendered('<h1 id="only">Only</h1>'), 'Only'), null)
    assert.equal(pageDescription(undefined, 'Only'), null)
})
