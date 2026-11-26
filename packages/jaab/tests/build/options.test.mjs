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

test('an alias redirects below both bases, and stays out of the sitemap', async () => {
    const moved = { 'blog/moved.md': '---\ndate: 2026-11-25\naliases: [old/address]\n---\n\n# Moved\n' }
    const site = await blog({ routeBase: '/blog' }, { base: '/repo' }, moved)

    assert.match(site.read('blog/old/address/index.html'), /http-equiv="refresh"[^>]*url=\/repo\/blog\/moved\//)
    assert.match(site.read('sitemap-0.xml'), /<loc>https:\/\/example\.dev\/repo\/blog\/moved\/<\/loc>/)
    assert.doesNotMatch(site.read('sitemap-0.xml'), /old\/address/)
})
