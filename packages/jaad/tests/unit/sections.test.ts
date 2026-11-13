import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { resolveConfig } from '../../src/config.ts'
import { findAliases } from '../../src/integration.ts'
import { rehypeDocLinks } from '../../src/link-plugins.ts'
import { buildDocsNavigation } from '../../src/navigation.ts'
import {
    collectionIdFor,
    docAliases,
    docSlug,
    docCanonicalSlug,
    sortDocPages,
    validateDocsStructure,
} from '../../src/utils/docs.ts'
import { resolveDocLink } from '../../src/utils/links.ts'

const urls = { docsBase: '' }

/** Pages as the collection hands them over, section attached. */
const inSections = (...ids: string[]) =>
    ids.map((id) => {
        const [section, ...rest] = id.split('/')
        return { id, path: rest.join('/'), section }
    })

function withTree(files: Record<string, string>, run: (root: string) => void) {
    const root = mkdtempSync(join(tmpdir(), 'jaad-sections-'))
    try {
        for (const [file, content] of Object.entries(files)) {
            mkdirSync(join(root, file, '..'), { recursive: true })
            writeFileSync(join(root, file), content)
        }
        run(root)
    } finally {
        rmSync(root, { recursive: true })
    }
}

// ── Ids ──────────────────────────────────────────────────────────────────────

test('a file gets the key of the section its directory is', () => {
    assert.equal(collectionIdFor('02-setup/01-install.md', 'guide', []), 'guide/02-setup/01-install')
    assert.equal(collectionIdFor('02-setup\\01-install.md', 'guide', []), 'guide/02-setup/01-install')
})

test('the locale stays in front of the section', () => {
    assert.equal(collectionIdFor('it/01-intro.md', 'guide', ['en', 'it']), 'it/guide/01-intro')
})

test('without sections the id is the path', () => {
    assert.equal(collectionIdFor('02-guides/01-setup.md', undefined, []), '02-guides/01-setup')
})

// ── Order and urls ───────────────────────────────────────────────────────────

test('sections sort in the declared order, pages by their own inside each', () => {
    const pages = inSections('api/02-server', 'guide/02-setup/01-install', 'api/01-client', 'guide/01-intro')
    assert.deepEqual(
        sortDocPages(pages, ['guide', 'api']).map((page) => page.id),
        ['guide/01-intro', 'guide/02-setup/01-install', 'api/01-client', 'api/02-server'],
    )
})

test('the slug of a page starts with its section', () => {
    const [install] = inSections('guide/02-setup/01-install')
    assert.equal(docSlug(install), 'guide/setup/install')
})

test('the first page opens the docs, the first of a later section opens the section', () => {
    const pages = inSections('guide/01-intro', 'guide/02-next', 'api/01-client', 'api/02-server')
    assert.deepEqual(
        pages.map((page, index) => docCanonicalSlug(page, index, pages)),
        ['', 'guide/next', 'api', 'api/server'],
    )
})

test('two sections may hold the same chapter and the same page name', () => {
    assert.doesNotThrow(() => {
        validateDocsStructure(inSections('guide/01-setup/01-install', 'api/01-setup/01-install'))
    })
})

test('a conflict inside a section names the section', () => {
    assert.throws(() => {
        validateDocsStructure(inSections('api/01-client', 'api/02-client'))
    }, /api\/01-client, api\/02-client all resolve to \/api\/client/)
})

test('one chapter level is the limit inside a section too', () => {
    assert.throws(() => {
        validateDocsStructure(inSections('api/01-a/02-b/03-c'))
    }, /api\/01-a\/02-b\/03-c: only one chapter directory is supported/)
})

// ── Pages outside the sections ───────────────────────────────────────────────

const loose = (id: string) => ({ id, path: id })

test('a page outside the sections opens the docs, and every section keeps its url', () => {
    const pages = sortDocPages(
        [...inSections('guide/01-intro', 'api/01-client'), loose('01-welcome')],
        ['guide', 'api'],
    )
    assert.deepEqual(
        pages.map((page, index) => docCanonicalSlug(page, index, pages)),
        ['', 'guide', 'api'],
    )
    assert.deepEqual(
        pages.flatMap((page, index) => docAliases(page, index, pages)),
        ['welcome', 'guide/intro', 'api/client'],
    )
})

test('a page outside the sections cannot take a section url', () => {
    assert.throws(
        () => validateDocsStructure([...inSections('guide/01-intro'), loose('02-guide')]),
        /02-guide resolves into section \/guide/,
    )
})

test('the navigation lists the pages outside the sections first', () => {
    const pages = [loose('01-welcome'), ...inSections('guide/01-intro')]
    const { groups, nextPage } = buildDocsNavigation(pages, '01-welcome', urls, [{ key: 'guide', label: 'Guide' }])
    assert.deepEqual(
        groups.map((group) => group.type),
        ['page', 'section'],
    )
    assert.equal(nextPage?.href, '/guide')
})

// ── Navigation ───────────────────────────────────────────────────────────────

const SECTIONS = [
    { key: 'guide', label: 'Guide' },
    { key: 'api', label: 'API' },
]

test('navigation puts every section at the top, with its pages and chapters below', () => {
    const pages = inSections('guide/01-intro', 'guide/02-setup/01-install', 'api/01-client', 'api/02-server')
    const { groups } = buildDocsNavigation(pages, 'guide/01-intro', urls, SECTIONS)

    assert.deepEqual(
        groups.map((group) =>
            group.type === 'section'
                ? [group.label, group.entries.map((entry) => (entry.type === 'page' ? entry.item.href : entry.chapter))]
                : null,
        ),
        [
            ['Guide', ['/', 'setup']],
            ['API', ['/api', '/api/server']],
        ],
    )
})

test('a section with no pages has no entry', () => {
    const pages = inSections('guide/01-intro')
    const { groups } = buildDocsNavigation(pages, 'guide/01-intro', urls, SECTIONS)
    assert.equal(groups.length, 1)
})

test('previous and next run across the sections', () => {
    const pages = inSections('guide/01-intro', 'guide/02-next', 'api/01-client', 'api/02-server')

    const last = buildDocsNavigation(pages, 'guide/02-next', urls, SECTIONS)
    assert.equal(last.previousPage?.href, '/')
    assert.equal(last.nextPage?.href, '/api')

    const opener = buildDocsNavigation(pages, 'api/01-client', urls, SECTIONS)
    assert.equal(opener.previousPage?.href, '/guide/next')
})

// ── Configuration ────────────────────────────────────────────────────────────

test('a section keeps its directory, and takes its label from the key', () => {
    const config = resolveConfig(
        { title: 'T', sections: { guide: { dir: './guide', label: 'The Guide' }, api: { dir: '../shared/api' } } },
        tmpdir(),
    )
    assert.deepEqual(
        config.docsSections.map(({ key, label, dir }) => ({ key, label, dir })),
        [
            { key: 'guide', label: 'The Guide', dir: './guide' },
            { key: 'api', label: 'Api', dir: '../shared/api' },
        ],
    )
})

test('a section inside another is refused', () => {
    assert.throws(
        () =>
            resolveConfig({ title: 'T', sections: { docs: { dir: './docs' }, api: { dir: './docs/api' } } }, tmpdir()),
        /api: docs\/api is, or is inside, another/,
    )
})

test('docsDir is read alongside sections only when set, and cannot hold one', () => {
    const sections = { guide: { dir: './guide' } }
    assert.equal(resolveConfig({ title: 'T', sections }, tmpdir()).docsDirInUse, false)
    assert.equal(resolveConfig({ title: 'T', sections, docsDir: './intro' }, tmpdir()).docsDirInUse, true)
    assert.equal(resolveConfig({ title: 'T' }, tmpdir()).docsDirInUse, true)
    assert.throws(
        () => resolveConfig({ title: 'T', docsDir: './docs', sections: { api: { dir: './docs/api' } } }, tmpdir()),
        /api: docs\/api is, or is inside, another/,
    )
})

test('a section cannot have the name of a language of the docs', () => {
    withTree(
        { 'guide/en/01-a.md': '# A', 'guide/it/01-a.md': '# A', 'it/en/01-b.md': '# B', 'it/it/01-b.md': '# B' },
        (root) => {
            assert.throws(
                () => resolveConfig({ title: 'T', sections: { guide: { dir: './guide' }, it: { dir: './it' } } }, root),
                /section "it" has the name of a language/,
            )
        },
    )
})

test('a section key is a url segment', () => {
    assert.throws(
        () => resolveConfig({ title: 'T', sections: { 'My Guide': { dir: './guide' } } }, tmpdir()),
        /section key/,
    )
})

test('sections have to agree on their languages', () => {
    withTree({ 'guide/en/01-a.md': '# A', 'guide/it/01-a.md': '# A', 'api/01-b.md': '# B' }, (root) => {
        assert.throws(
            () => resolveConfig({ title: 'T', sections: { guide: { dir: './guide' }, api: { dir: './api' } } }, root),
            /sections disagree on their languages/,
        )
    })
})

// ── Redirecting urls ─────────────────────────────────────────────────────────

test('every section opener, and the first section key, has a url that redirects', () => {
    withTree(
        {
            'guide/01-intro.md': '# Intro',
            'guide/02-next.md': '# Next',
            'api/01-client.md': '# Client',
            'api/02-server.md': '# Server',
        },
        (root) => {
            const roots = [
                { dir: join(root, 'guide'), section: 'guide' },
                { dir: join(root, 'api'), section: 'api' },
            ]
            assert.deepEqual(
                findAliases(roots).map((page) => page.slug),
                ['guide/intro', 'guide', 'api/client'],
            )
        },
    )
})

// ── Relative links ───────────────────────────────────────────────────────────

test('a relative link to a markdown file resolves to the page url', () => {
    withTree(
        { 'guide/01-intro.md': '', 'guide/02-setup/01-install.md': '', 'api/01-client.md': '', 'notes.md': '' },
        (root) => {
            const context = {
                roots: [
                    { dir: join(root, 'guide'), section: 'guide' },
                    { dir: join(root, 'api'), section: 'api' },
                ],
                locales: [],
                urls: () => ({ docsBase: '/docs', deploymentBase: '/repo' }),
            }
            const from = join(root, 'guide', '01-intro.md')

            assert.equal(resolveDocLink('./02-setup/01-install.md', from, context), '/repo/docs/guide/setup/install')
            assert.equal(
                resolveDocLink('02-setup/01-install.md#steps', from, context),
                '/repo/docs/guide/setup/install#steps',
            )
            assert.equal(resolveDocLink('../api/01-client.md', from, context), '/repo/docs/api/client')

            // Left as written.
            assert.equal(resolveDocLink('https://example.dev/a.md', from, context), null)
            assert.equal(resolveDocLink('/docs/guide/intro', from, context), null)
            assert.equal(resolveDocLink('#steps', from, context), null)
            assert.equal(resolveDocLink('./image.png', from, context), null)
            assert.equal(resolveDocLink('../notes.md', from, context), null)

            assert.throws(
                () => resolveDocLink('./missing.md', from, context),
                /links to \.\/missing\.md, which does not exist/,
            )
        },
    )
})

test('a link in a localised tree keeps its language', () => {
    withTree({ 'docs/it/01-intro.md': '', 'docs/it/02-guida.md': '' }, (root) => {
        const context = {
            roots: [{ dir: join(root, 'docs') }],
            locales: ['en', 'it'],
            urls: (locale?: string) => ({ docsBase: '', locale, defaultLocale: 'en' }),
        }
        assert.equal(resolveDocLink('./02-guida.md', join(root, 'docs', 'it', '01-intro.md'), context), '/it/guida')
    })
})

test('the rehype plugin rewrites the links of a tree', () => {
    withTree({ 'docs/01-intro.md': '', 'docs/02-next.md': '' }, (root) => {
        const link = (href: string) => ({ type: 'element', tagName: 'a', properties: { href }, children: [] })
        const tree = {
            type: 'root',
            children: [{ type: 'element', tagName: 'p', children: [link('./02-next.md'), link('#top')] }],
        }

        const context = { roots: [{ dir: join(root, 'docs') }], locales: [], urls: () => ({ docsBase: '' }) }
        rehypeDocLinks(context)()(tree, { path: join(root, 'docs', '01-intro.md') })

        assert.deepEqual(
            tree.children[0].children.map((node) => node.properties.href),
            ['/next', '#top'],
        )
    })
})
