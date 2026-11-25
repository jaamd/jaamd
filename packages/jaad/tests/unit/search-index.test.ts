import type { DocsSource } from '../../src/docs/model/tree.ts'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { SEARCH_INDEX_VERSION } from '@jaamd/site/search.ts'
import { buildDocsTree } from '../../src/docs/model/tree.ts'
import { buildSearchIndex } from '../../src/docs/search-index.ts'

const page = (id: string, html: string, more: Partial<DocsSource> = {}): DocsSource => {
    return {
        id,
        path: id,
        data: {},
        rendered: {
            html,
            metadata: {
                headings: [...html.matchAll(/<h([1-6]) id="([^"]*)">([^<]*)/g)].map(([, depth, slug, text]) => {
                    return {
                        depth: Number(depth),
                        slug,
                        text,
                    }
                }),
            },
        },
        ...more,
    }
}

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
        index.pages.map((page) => {
            return [page.href, page.section]
        }),
        [
            ['/', 'guide'],
            ['/guide/next', 'guide'],
        ],
    )
})

test('the index carries its version and the Markdown of each page', () => {
    const tree = buildDocsTree([{ id: 'guide', path: 'guide', data: {} } as DocsSource], { urls: { docsBase: '' } })
    const index = buildSearchIndex(tree, [], (page) => {
        return `/${page.slug}.md`
    })
    assert.equal(index.version, SEARCH_INDEX_VERSION)
    assert.equal(index.pages[0].markdown, '/guide.md')
})
