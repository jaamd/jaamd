import type { DocsSource } from '../../src/docs/model/tree.ts'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { pageChunks } from '../../src/docs/model/rendered.ts'
import { buildDocsTree } from '../../src/docs/model/tree.ts'
import { buildSearchIndex } from '../../src/docs/search-index.ts'
import {
    getSnippet,
    markWords,
    openingPages,
    queryTerms,
    search,
    type SearchIndex,
    type SearchPage,
} from '../../src/site/search.ts'

/** An index of pages, each `[title, ...[heading, text]]`, the first pair
 *  with no heading being the text before the first one. */
function indexOf(...pages: { page: Partial<SearchPage>; entries: [string | undefined, string][] }[]): SearchIndex {
    const index: SearchIndex = { sections: [], pages: [], entries: [] }
    pages.forEach(({ page, entries }, at) => {
        index.pages.push({ title: 'Page', href: `/p${at}`, ...page })
        for (const [heading, text] of entries) {
            index.entries.push({ page: at, ...(heading ? { heading, anchor: heading.toLowerCase() } : {}), text })
        }
    })
    return index
}

const titles = (index: SearchIndex, query: string, section?: string) =>
    search(index, query, section).map((group) => group.page.title)

// ── Splitting a page at its headings ─────────────────────────────────────────

test('a page is cut at its h2 and h3, the title left out', () => {
    const chunks = pageChunks({
        html: '<h1 id="title">Title</h1><p>Intro.</p><h2 id="one">One</h2><p>First.</p><h3 id="two">Two</h3><p>Second.</p><h4 id="deep">Deep</h4><p>Still second.</p>',
    })
    assert.deepEqual(
        chunks.map((chunk) => [chunk.heading?.slug ?? null, chunk.text]),
        [
            [null, 'Intro.'],
            ['one', 'First.'],
            ['two', 'Second. Deep Still second.'],
        ],
    )
})

test('code samples are left out of the text', () => {
    const chunks = pageChunks({ html: '<h2 id="real">Real</h2><p>Use it.</p><pre><code>## Example</code></pre>' })
    assert.equal(chunks.length, 2)
    assert.equal(chunks[1].text, 'Use it.')
})

test('a heading takes the text and the id the renderer gave it', () => {
    const [, chunk] = pageChunks({
        html: '<h2 id="install-it">Install <code>it</code><a class="jaamd-heading-link" href="#install-it"><svg></svg></a></h2>',
        metadata: { headings: [{ depth: 2, slug: 'install-it', text: 'Install it' }] },
    })
    assert.deepEqual(chunk.heading, { depth: 2, slug: 'install-it', text: 'Install it' })
})

// ── Building the index ───────────────────────────────────────────────────────

const page = (id: string, html: string, more: Partial<DocsSource> = {}): DocsSource => ({
    id,
    path: id,
    data: {},
    rendered: {
        html,
        metadata: {
            headings: [...html.matchAll(/<h([1-6]) id="([^"]*)">([^<]*)/g)].map(([, depth, slug, text]) => ({
                depth: Number(depth),
                slug,
                text,
            })),
        },
    },
    ...more,
})

test('the index has one entry per heading, each with its anchor and text', () => {
    const tree = buildDocsTree(
        [
            page(
                '02-guides/01-setup',
                '<h1 id="setup">Setup</h1><p>Read <strong>this</strong> first.</p><h2 id="install-it">Install it</h2><table><tr><th>a</th><th>b</th></tr><tr><td>c</td><td>d</td></tr></table>',
                { data: { keywords: ['start'] } },
            ),
        ],
        { urls: { docsBase: '/docs' } },
    )
    const index = buildSearchIndex(tree, [])
    assert.deepEqual(index.pages, [{ title: 'Setup', href: '/docs', chapter: 'Guides', keywords: ['start'] }])
    assert.deepEqual(index.entries, [
        { page: 0, text: 'Read this first.' },
        { page: 0, heading: 'Install it', anchor: 'install-it', text: 'a b c d' },
    ])
})

test('the index lists only the sections with pages, at the pages own urls', () => {
    const tree = buildDocsTree(
        [
            page('guide/01-intro', '<h1 id="intro">Intro</h1>', { path: '01-intro', section: 'guide' }),
            page('guide/02-next', '<h1 id="next">Next</h1>', { path: '02-next', section: 'guide' }),
        ],
        { sections: ['guide', 'api'], urls: { docsBase: '' } },
    )
    const index = buildSearchIndex(tree, [
        { key: 'guide', label: 'Guide' },
        { key: 'api', label: 'API' },
    ])
    assert.deepEqual(index.sections, [{ key: 'guide', label: 'Guide' }])
    assert.deepEqual(
        index.pages.map((page) => [page.href, page.section]),
        [
            ['/', 'guide'],
            ['/guide/next', 'guide'],
        ],
    )
})

// ── Matching ─────────────────────────────────────────────────────────────────

test('queries ignore case and accents', () => {
    assert.deepEqual(queryTerms('  Città, CAFÉ!'), ['citta', 'cafe'])
    const index = indexOf({ page: { title: 'Perché' }, entries: [[undefined, 'Una città.']] })
    assert.deepEqual(titles(index, 'perche citta'), ['Perché'])
})

test('every word must appear, in the entry or its page', () => {
    const index = indexOf(
        { page: { title: 'Install' }, entries: [['Astro', 'Add the integration.']] },
        { page: { title: 'Deploy' }, entries: [['Astro', 'Build first.']] },
    )
    assert.deepEqual(titles(index, 'install astro'), ['Install'])
    assert.deepEqual(titles(index, 'install vercel'), [])
})

test('a word matches the words it starts', () => {
    const index = indexOf({ page: { title: 'Configuration' }, entries: [[undefined, 'Options.']] })
    assert.deepEqual(titles(index, 'config'), ['Configuration'])
    assert.deepEqual(titles(index, 'figur'), [])
})

test('the title outranks a heading, which outranks the text', () => {
    const index = indexOf(
        { page: { title: 'Notes' }, entries: [[undefined, 'about themes']] },
        { page: { title: 'Styles' }, entries: [['Themes', 'Pick one.']] },
        { page: { title: 'Themes' }, entries: [[undefined, 'All of them.']] },
    )
    assert.deepEqual(titles(index, 'themes'), ['Themes', 'Styles', 'Notes'])
})

test('a whole word outranks a word it only starts', () => {
    const index = indexOf(
        { page: { title: 'Tables extended' }, entries: [[undefined, '']] },
        { page: { title: 'Table' }, entries: [[undefined, '']] },
    )
    assert.deepEqual(titles(index, 'table'), ['Table', 'Tables extended'])
})

test('keywords and the chapter are searched', () => {
    const index = indexOf(
        { page: { title: 'A', keywords: ['media'] }, entries: [[undefined, 'x']] },
        { page: { title: 'B', chapter: 'Getting started' }, entries: [[undefined, 'y']] },
    )
    assert.deepEqual(titles(index, 'media'), ['A'])
    assert.deepEqual(titles(index, 'getting'), ['B'])
})

// ── Results ──────────────────────────────────────────────────────────────────

test('a page lists the headings that matched, each at its anchor', () => {
    const index = indexOf({
        page: { title: 'Guide' },
        entries: [
            [undefined, 'Intro.'],
            ['Deploy', 'Ship it.'],
            ['Other', 'Unrelated.'],
            ['Notes', 'Deploy later.'],
        ],
    })
    const [group] = search(index, 'deploy')
    assert.equal(group.intro, undefined)
    assert.deepEqual(
        group.hits.map((hit) => hit.href),
        ['/p0#deploy', '/p0#notes'],
    )
})

test('a title match alone lists no headings', () => {
    const index = indexOf({ page: { title: 'Deploy' }, entries: [['Build', 'Run it.']] })
    const [group] = search(index, 'deploy')
    assert.deepEqual(group.hits, [])
})

test('the section filter keeps one section', () => {
    const index = indexOf(
        { page: { title: 'Client', section: 'api' }, entries: [[undefined, 'setup']] },
        { page: { title: 'Intro', section: 'guide' }, entries: [[undefined, 'setup']] },
    )
    assert.deepEqual(titles(index, 'setup', 'guide'), ['Intro'])
    assert.equal(titles(index, 'setup').length, 2)
})

test('results are capped at eight pages', () => {
    const index = indexOf(
        ...Array.from({ length: 20 }, () => ({
            page: { title: 'Match' },
            entries: [[undefined, ''] as [undefined, string]],
        })),
    )
    assert.equal(search(index, 'match').length, 8)
})

test('an empty query shows the first pages of each section', () => {
    const index = indexOf(
        ...['guide', 'guide', 'api'].map((section, at) => ({
            page: { title: `P${at}`, section },
            entries: [] as [undefined, string][],
        })),
    )
    index.sections = [
        { key: 'guide', label: 'Guide' },
        { key: 'api', label: 'API' },
    ]
    assert.deepEqual(search(index, '  '), [])
    assert.deepEqual(
        openingPages(index).map((group) => [group.label, group.pages.map((page) => page.title)]),
        [
            ['Guide', ['P0', 'P1']],
            ['API', ['P2']],
        ],
    )
    assert.deepEqual(
        openingPages(index, 'api').map((group) => group.label),
        ['API'],
    )
})

test('an empty query starts with the pages outside the sections', () => {
    const index = indexOf(
        { page: { title: 'Welcome' }, entries: [] },
        { page: { title: 'Intro', section: 'guide' }, entries: [] },
    )
    index.sections = [{ key: 'guide', label: 'Guide' }]
    assert.deepEqual(
        openingPages(index).map((group) => [group.label, group.pages.map((page) => page.title)]),
        [
            [undefined, ['Welcome']],
            ['Guide', ['Intro']],
        ],
    )
    assert.deepEqual(
        openingPages(index, 'guide').map((group) => group.label),
        ['Guide'],
    )
})

// ── Snippets and marks ───────────────────────────────────────────────────────

test('a snippet is cut around the first match and ellipsised where cut', () => {
    const text = 'x'.repeat(200) + ' needle ' + 'y'.repeat(200)
    const snippet = getSnippet(text, ['needle'])
    assert.ok(snippet.startsWith('…') && snippet.endsWith('…'))
    assert.ok(snippet.includes('needle'))
    assert.ok(!getSnippet('needle in front', ['needle']).startsWith('…'))
})

test('without a match the snippet is the start of the text', () => {
    assert.equal(getSnippet('Short text.', ['absent']), 'Short text.')
})

test('marks cover the matched start of each word, accents included', () => {
    assert.deepEqual(markWords('Configure the città', ['config', 'citt']), [
        { text: 'Config', match: true },
        { text: 'ure the ', match: false },
        { text: 'citt', match: true },
        { text: 'à', match: false },
    ])
    assert.deepEqual(markWords('città', ['citta']), [{ text: 'città', match: true }])
    assert.deepEqual(markWords('cafe\u0301s', ['cafe']), [
        { text: 'cafe\u0301', match: true },
        { text: 's', match: false },
    ])
})
