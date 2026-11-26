/** A blog inside a site with a look of its own: the project's layout renders every page. */

import assert from 'node:assert/strict'
import { join } from 'node:path'
import { after, before, describe, test } from 'node:test'
import jaamd from '@jaamd/astro'
import { build } from 'astro'
import jaab from '../../index.ts'
import { allCss } from '../dist.mjs'
import { built, inline, project, removeProjects } from './projects.mjs'

/** Writes what it receives where the tests can read it, as a site's layout would place it. */
const LAYOUT = `---
import BlogMeta from '@jaamd/jaab/components/BlogMeta.astro'
import type { BlogLayoutProps } from '@jaamd/jaab/layout'

const props = Astro.props as BlogLayoutProps
---

<html lang="en">
    <head>
        <title>{props.meta.head.title}</title>
        <BlogMeta {...props.meta} />
    </head>
    <body data-kind={props.kind}>
        {props.kind === 'index' ? (
            <main data-page={props.page} data-pages={props.pages} data-newer={props.newerHref} data-older={props.olderHref} data-feed={props.feedHref}>
                <ol>{props.posts.map((post) => <li data-day={post.day}><a href={post.href}>{post.title}</a></li>)}</ol>
                <div class="intro"><slot /></div>
            </main>
        ) : (
            <main data-day={props.post.day} data-minutes={props.post.readingTime} data-older={props.post.older?.href} data-newer={props.post.newer?.href} data-index={props.indexHref}>
                <article><slot /></article>
            </main>
        )}
    </body>
</html>
`

const post = (day, title) => {
    return [
        `blog/2026-11-${day}-${title.toLowerCase()}.md`,
        `---\ntitle: ${title}\ndate: 2026-11-${day}\n---\n\nText of ${title}.\n`,
    ]
}

const POSTS = Object.fromEntries([post('20', 'First'), post('21', 'Second'), post('22', 'Third')])

const options = (extra = {}) => {
    return { title: 'Site', routeBase: '/blog', perPage: 2, layout: './src/layouts/Blog.astro', ...extra }
}

const SITE = { site: 'https://example.dev' }

after(() => {
    removeProjects()
})

describe("the project's layout", () => {
    let root
    let site

    before(async () => {
        root = project({
            ...POSTS,
            'blog/index.md': '# Notes\n\nWhat I write.\n',
            'src/layouts/Blog.astro': LAYOUT,
        })
        await build(inline(root, jaab(options()), SITE))
        site = built(root)
    })

    test('renders the index, its pages and the introduction', () => {
        const index = site.read('blog/index.html')
        assert.match(index, /data-kind="index"/)
        assert.match(index, /data-page="1" data-pages="2" data-older="\/blog\/page\/2\/" data-feed="\/blog\/rss\.xml"/)
        assert.match(index, /<li data-day="2026-11-22"><a href="\/blog\/third\/">Third<\/a><\/li>/)
        assert.match(index, /<div class="intro"><h1 id="notes">Notes/)
        assert.match(site.read('blog/page/2/index.html'), /data-newer="\/blog\/"[\s\S]*First/)
    })

    test('renders each post with its body, its day and its neighbours', () => {
        const second = site.read('blog/second/index.html')
        assert.match(second, /data-kind="post"/)
        assert.match(
            second,
            /data-day="2026-11-21" data-minutes="1" data-older="\/blog\/first\/" data-newer="\/blog\/third\/"/,
        )
        assert.match(second, /<article><p>Text of Second\.<\/p>/)
    })

    test('BlogMeta writes the metadata in its head', () => {
        const second = site.read('blog/second/index.html')
        assert.match(second, /<title>Second \| Site<\/title>/)
        assert.match(second, /<link rel="canonical" href="https:\/\/example\.dev\/blog\/second\/">/)
        assert.match(second, /<meta property="article:published_time" content="2026-11-21T00:00:00\.000Z">/)
        assert.match(second, /"@type":"BlogPosting"/)
        assert.match(second, /<link rel="alternate" type="application\/rss\+xml" title="Site" href="\/blog\/rss\.xml">/)
    })

    test('leaves out the shell: its stylesheets and its 404', () => {
        assert.doesNotMatch(allCss(join(root, 'dist')), /\.blog-list|\.site-header/)
        assert.equal(site.files.includes('/404.html'), false)
    })

    test('keeps the rest of the blog: feed, Markdown and llms.txt', () => {
        assert.equal(site.read('blog/rss.xml').match(/<item>/g)?.length, 3)
        assert.match(site.read('blog/second.md'), /Text of Second\./)
        assert.match(site.read('llms.txt'), /\[Second\]\(https:\/\/example\.dev\/blog\/second\.md\)/)
    })
})

test('a layout that is not there stops the build, saying what to create', async () => {
    const root = project(POSTS)
    await assert.rejects(
        build(inline(root, jaab(options()), SITE)),
        /jaab: layout is "\.\/src\/layouts\/Blog\.astro", which does not exist/,
    )
})

test("jaamd() in the project's own integrations stops the build", async () => {
    const root = project({ ...POSTS, 'src/layouts/Blog.astro': LAYOUT })
    await assert.rejects(
        build(inline(root, [jaamd(), ...jaab(options())], SITE)),
        /jaamd: the project adds jaamd\(\) to its integrations[\s\S]*give its theme to the package's config/,
    )
})

test("a page of the project's own on the blog's index stops the build", async () => {
    const root = project({ ...POSTS, 'src/layouts/Blog.astro': LAYOUT, 'src/pages/blog/index.astro': '<p>Mine</p>\n' })
    await assert.rejects(build(inline(root, jaab(options()), SITE)), /takes \/blog, which @jaamd\/jaab serves/)
})
