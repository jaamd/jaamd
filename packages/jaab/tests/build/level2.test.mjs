/** Docs and a blog in one site: each package on its pages, the site's parts once. */

import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { after, before, describe, test } from 'node:test'
import { build } from 'astro'
import jaad from '../../../jaad/index.ts'
import jaab from '../../index.ts'
import { BOTH_COLLECTIONS, built, inline, project, removeProjects } from './projects.mjs'

const URL_OF_SITE = 'https://example.dev'

/** The options both packages share, as `defineSiteConfig` holds them. */
const SITE = { title: 'Both', description: 'Docs and a blog.' }

/** Docs and a blog, with a page or two each and `files` on top. */
function both(files = {}) {
    return project({
        'src/content.config.ts': BOTH_COLLECTIONS,
        'docs/01-intro.md': '# Intro\n\nThe docs open here.\n',
        'docs/02-guide.md': '# Guide\n\nThe docs.\n',
        'blog/2026-11-22-first.md': '---\ntitle: First post\ndate: 2026-11-22\n---\n\nThe blog.\n',
        ...files,
    })
}

const integrations = ({ docsBase = '/', blogBase = '/blog', blogSite = SITE } = {}) => {
    return [...jaad({ ...SITE, routeBase: docsBase }), ...jaab({ ...blogSite, routeBase: blogBase })]
}

const buildBoth = (root, options) => {
    return build(inline(root, integrations(options), { site: URL_OF_SITE }))
}

after(() => {
    removeProjects()
})

describe('docs at the root and a blog at /blog', () => {
    let read

    before(async () => {
        const root = both()
        await buildBoth(root)
        read = built(root).read
    })

    test('each package serves its pages', () => {
        assert.match(read('guide/index.html'), /The docs\./)
        assert.match(read('blog/first/index.html'), /The blog\./)
        assert.match(read('blog/index.html'), /class="blog-list-title" href="\/blog\/first\/"/)
    })

    test('one sitemap lists both, and one 404 is served', () => {
        const sitemap = read('sitemap-0.xml')
        assert.match(sitemap, /<loc>https:\/\/example\.dev\/guide\/<\/loc>/)
        assert.match(sitemap, /<loc>https:\/\/example\.dev\/blog\/first\/<\/loc>/)
        assert.match(read('404.html'), /class="site-not-found/)
    })

    test('the root llms.txt has a section for each package', () => {
        const llms = read('llms.txt')
        assert.match(llms, /^# Both\n/)
        assert.match(llms, /## Docs\n[\s\S]*## Blog\n\n- \[First post\]\(https:\/\/example\.dev\/blog\/first\.md\)/)
        assert.match(read('blog/llms.txt'), /- \[First post\]/)
    })

    test('the feed is linked from the docs too, the search only there', () => {
        const docs = read('guide/index.html')
        const post = read('blog/first/index.html')

        for (const html of [docs, post]) {
            assert.match(
                html,
                /<link rel="alternate" type="application\/rss\+xml" title="Both" href="\/blog\/rss\.xml">/,
            )
            assert.match(html, /aria-label="RSS feed"/)
        }
        assert.match(docs, /<site-search/)
        assert.doesNotMatch(post, /<site-search/)
    })

    test('the footer credits both', () => {
        assert.match(
            read('blog/first/index.html'),
            /Built with <a href="https:\/\/docs\.jaamd\.org\/jaad" rel="noopener">JAAD<\/a> and <a href="https:\/\/docs\.jaamd\.org\/jaab" rel="noopener">JAAB<\/a> · <a href="\/blog\/rss\.xml">RSS feed<\/a>/,
        )
    })
})

test('the packages of a site must agree on its options', async () => {
    const root = both()
    await assert.rejects(
        buildBoth(root, { blogSite: { ...SITE, title: 'Other' } }),
        /set its options differently[\s\S]*title/,
    )
})

test('a docs page inside the blog stops the build', async () => {
    const root = both({ 'docs/blog/notes.md': '# Notes\n' })
    assert.equal(existsSync(join(root, 'docs/blog/notes.md')), true)
    await assert.rejects(buildBoth(root), /docs pages inside the pages of another package/)
})

test('a post inside the docs stops the build', async () => {
    const root = both({ 'blog/docs.md': '---\ndate: 2026-11-22\n---\n\n# Docs\n' })
    await assert.rejects(
        buildBoth(root, { docsBase: '/docs', blogBase: '/' }),
        /posts inside the pages of another package\n {2}blog\/docs\.md would be served at \/docs, which @jaamd\/jaad serves/,
    )
})

test('a post without a date stops the build, naming the file', async () => {
    const root = both({ 'blog/undated.md': '# Undated\n' })
    await assert.rejects(buildBoth(root), /jaab: the posts need fixing\n {2}blog\/undated\.md has no date/)
})
