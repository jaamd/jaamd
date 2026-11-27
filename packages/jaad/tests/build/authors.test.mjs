/** Who wrote a page: on the page, in its head and in its structured data. */

import assert from 'node:assert/strict'
import { after, before, describe, test } from 'node:test'
import { build } from 'astro'
import jaad from '../../index.ts'
import { built, inline, project, removeProjects } from './projects.mjs'

const page = (frontmatter, title) => {
    return `---\n${frontmatter}\n---\n\n# ${title}\n\nText.\n`
}

const DOCS = {
    'docs/01-named.md': page('authors: [ada, { name: Charles Babbage, url: /people/charles/ }]', 'Named'),
    'docs/02-default.md': '# Default\n\nText.\n',
    'docs/03-nobody.md': page('authors: []', 'Nobody'),
    'docs/04-older.md': page('author: Mary Somerville', 'Older'),
}

const OPTIONS = {
    title: 'Authors',
    authors: {
        ada: { name: 'Ada Lovelace', url: 'https://ada.example' },
        grace: { name: 'Grace Hopper' },
    },
    author: 'grace',
}

after(removeProjects)

describe('the authors of a page', () => {
    let site

    before(async () => {
        const root = project(DOCS)
        await build(inline(root, jaad(OPTIONS), { site: 'https://example.dev', base: '/repo' }))
        site = built(root)
    })

    test('are named above the title, each with a url a link to it', () => {
        const named = site.read('index.html')
        assert.match(
            named,
            /<p class="docs-page-meta"><span><a href="https:\/\/ada\.example" rel="author">Ada Lovelace<\/a> and <a href="\/repo\/people\/charles\/" rel="author">Charles Babbage<\/a><\/span><\/p>/,
        )
        assert.ok(named.indexOf('docs-page-meta') < named.indexOf('<h1'), 'the authors are not above the title')
    })

    test('are each a meta, and a link when they have a url', () => {
        const named = site.read('index.html')
        assert.match(named, /<meta name="author" content="Ada Lovelace"><meta name="author" content="Charles Babbage">/)
        assert.match(
            named,
            /<link rel="author" href="https:\/\/ada\.example"><link rel="author" href="\/repo\/people\/charles\/">/,
        )
        // A docs page is no article: Open Graph names no author.
        assert.doesNotMatch(named, /article:author/)
    })

    test('are people in the structured data, with absolute urls', () => {
        assert.match(
            site.read('index.html'),
            /"author":\[\{"@type":"Person","name":"Ada Lovelace","url":"https:\/\/ada\.example"\},\{"@type":"Person","name":"Charles Babbage","url":"https:\/\/example\.dev\/repo\/people\/charles\/"\}\]/,
        )
    })

    test("are the docs' default author when the page names none", () => {
        const fallback = site.read('default/index.html')
        assert.match(fallback, /<p class="docs-page-meta"><span>Grace Hopper<\/span><\/p>/)
        assert.match(fallback, /"author":\{"@type":"Person","name":"Grace Hopper"\}/)
    })

    test('are nobody with an empty list, even with a default', () => {
        const nobody = site.read('nobody/index.html')
        assert.doesNotMatch(nobody, /docs-page-meta|name="author"|"author":/)
    })

    test('are the older author field when it is all the page has', () => {
        const older = site.read('older/index.html')
        assert.match(older, /<p class="docs-page-meta"><span>Mary Somerville<\/span><\/p>/)
        assert.match(older, /<meta name="author" content="Mary Somerville">/)
    })
})
