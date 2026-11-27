/** The blog alone, with the options the fixture leaves at their defaults. */

import assert from 'node:assert/strict'
import { after, describe, test } from 'node:test'
import { build } from 'astro'
import jaab from '../../index.ts'
import { built, inline, project, removeProjects } from './projects.mjs'

const post = (day) => {
    return [
        `blog/2026-11-${day}-post-${day}.md`,
        `---\ntitle: Post ${day}\ndate: 2026-11-${day}\n---\n\n# Post ${day}\n\nText.\n`,
    ]
}

/** A blog of five posts and `files`, built with `options`. */
async function blog(options, astro = {}, files = {}) {
    const root = project({ ...Object.fromEntries(['20', '21', '22', '23', '24'].map(post)), ...files })
    await build(inline(root, jaab({ title: 'Blog', ...options }), { site: 'https://example.dev', ...astro }))
    return built(root)
}

after(() => {
    removeProjects()
})

describe('feed', () => {
    test('carries the newest posts up to its limit, each without the title its item has', async () => {
        const feed = (await blog({ feed: { limit: 2 } })).read('rss.xml')
        assert.equal(feed.match(/<item>/g)?.length, 2)
        assert.match(feed, /<title>Post 24<\/title>[\s\S]*<title>Post 23<\/title>/)
        assert.doesNotMatch(feed, /&lt;h1/)
    })

    test('false leaves it out, and its links with it', async () => {
        const site = await blog({ feed: false })
        assert.equal(site.files.includes('/rss.xml'), false)
        assert.doesNotMatch(site.read('index.html'), /application\/rss\+xml|RSS feed/)
    })
})

test('a footer of its own places the feed with :feed', async () => {
    const index = (await blog({ footer: '© 2026 Me · :feed' })).read('index.html')
    assert.match(index, /© 2026 Me · <a href="\/rss\.xml">RSS feed<\/a>/)
    assert.doesNotMatch(index, /Built with/)
})

test('the footer and the 404 are in the language of the site', async () => {
    const site = await blog({ lang: 'it' })
    const index = site.read('index.html')
    assert.match(index, /<h2[^>]*id="footer-heading">\s*Piè di pagina del sito\s*<\/h2>/)
    assert.match(
        index,
        /Realizzato con <a href="https:\/\/docs\.jaamd\.org\/jaab" rel="noopener">JAAB<\/a> · <a href="\/rss\.xml">Feed RSS<\/a>/,
    )

    const notFound = site.read('404.html')
    assert.match(notFound, /<meta name="description" content="La pagina che cerchi non esiste\.">/)
    assert.match(notFound, /<p class="site-not-found-text[^"]*">La pagina che cerchi non esiste\.<\/p>/)
    assert.match(notFound, />Torna alla pagina iniziale<\/a>/)
})

test('an alias redirects below both bases, and stays out of the sitemap', async () => {
    const moved = { 'blog/moved.md': '---\ndate: 2026-11-25\naliases: [old/address]\n---\n\n# Moved\n' }
    const site = await blog({ routeBase: '/blog' }, { base: '/repo' }, moved)

    assert.match(site.read('blog/old/address/index.html'), /http-equiv="refresh"[^>]*url=\/repo\/blog\/moved\//)
    assert.match(site.read('sitemap-0.xml'), /<loc>https:\/\/example\.dev\/repo\/blog\/moved\/<\/loc>/)
    assert.doesNotMatch(site.read('sitemap-0.xml'), /old\/address/)
})
