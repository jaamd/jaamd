import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { DIST, ROOT, allCss, brokenLinks, built, missingFrom, packageClasses } from '../dist.mjs'

/** The hrefs of the index's post titles, in order. */
const listed = (html) => {
    return [...html.matchAll(/class="blog-list-title" href="([^"]+)"/g)].map((match) => {
        return match[1]
    })
}

test('the index lists the posts newest first, then by slug on the same day', () => {
    assert.deepEqual(listed(built('index.html')), ['/oxlint/', '/introducing-jaab/'])
    assert.deepEqual(listed(built('page/2/index.html')), ['/hello/', '/same-day/'])
    assert.equal(existsSync(join(DIST, 'page/1/index.html')), false, 'the first page is the index itself')
    assert.equal(existsSync(join(DIST, 'page/3/index.html')), false)
})

test('blog/index.md introduces the index, and is no post', () => {
    const index = built('index.html')
    assert.match(index, /<h1 id="notes">Notes/)
    assert.match(index, /Release notes, design choices and the occasional guide\./)
    assert.equal(existsSync(join(DIST, 'index/index.html')), false)
})

test('the pager links the pages, and names the one shown', () => {
    assert.match(built('index.html'), /Page 1 of 2[\s\S]*href="\/page\/2\/" rel="next">Older posts/)
    assert.match(built('page/2/index.html'), /href="\/" rel="prev">[\s\S]*Newer posts[\s\S]*Page 2 of 2/)
})

test('a post shows its date, reading time and update, and links its neighbours', () => {
    const post = built('introducing-jaab/index.html')
    assert.match(post, /<time datetime="2026-11-22">Nov 22, 2026<\/time>/)
    assert.match(post, /1 min read/)
    assert.match(post, /Updated <time datetime="2026-11-24">Nov 24, 2026<\/time>/)
    assert.match(post, /href="\/hello\/" rel="prev"[\s\S]*href="\/oxlint\/" rel="next"/)
})

// 00:30 at +01:00 is the 22nd in UTC: the page shows the day the author wrote.
test('a post with a time keeps the day it is written on', () => {
    assert.match(built('oxlint/index.html'), /<time datetime="2026-11-23">Nov 23, 2026<\/time>/)
    assert.match(built('index.html'), /<time class="blog-list-date" datetime="2026-11-23">/)
})

test('a title in the frontmatter becomes the heading; one in the body stays', () => {
    assert.match(built('same-day/index.html'), /<h1>Same day<\/h1>/)
    const hello = built('hello/index.html')
    assert.match(hello, /<h1 id="hello-blog">Hello, blog/)
    assert.doesNotMatch(hello, /<h1>Hello, blog<\/h1>/)
})

test('a relative link to another post, or to the index, becomes its url', () => {
    const hello = built('hello/index.html')
    assert.match(hello, /<a href="\/oxlint\/#why">the move to oxlint<\/a>/)
    assert.match(hello, /<a href="\/">the index<\/a>/)
})

test('with several authors, a post names its own', () => {
    assert.match(built('oxlint/index.html'), /class="blog-post-byline">Ada Lovelace, Grace Hopper</)
    assert.match(built('introducing-jaab/index.html'), /class="blog-post-byline">Ada Lovelace</)
})

test('a post has the table of contents and the page actions beside it', () => {
    const post = built('introducing-jaab/index.html')
    assert.match(
        post,
        /<aside class="blog-aside[^"]*">[\s\S]*class="docs-toc"[\s\S]*data-md-href="\/introducing-jaab\.md"/,
    )
    assert.match(post, /href="#three-ways-in"[^>]*class="docs-toc-link"/)
})

test('a post is an article, with its dates and tags', () => {
    const post = built('introducing-jaab/index.html')
    assert.match(post, /<meta property="og:type" content="article">/)
    assert.match(post, /<meta property="article:published_time" content="2026-11-22T00:00:00.000Z">/)
    assert.match(post, /<meta property="article:tag" content="jaab">/)
    assert.match(post, /"@type":"BlogPosting"/)
    assert.match(post, /"datePublished":"2026-11-22T00:00:00.000Z"/)
})

test('the description is the text before <!-- more --> when the frontmatter has none', () => {
    assert.match(
        built('introducing-jaab/index.html'),
        /<meta name="description" content="JAAB is a blog for Astro, on the same shell as JAAD.">/,
    )
})

test('an alias redirects to its post and stays out of the sitemap', () => {
    assert.match(built('posts/introducing-jaab/index.html'), /url=\/introducing-jaab\//)
    assert.doesNotMatch(built('sitemap-0.xml'), /posts\/introducing-jaab/)
    assert.match(built('sitemap-0.xml'), /<loc>https:\/\/blog\.example\.com\/introducing-jaab\/<\/loc>/)
})

test('the feed carries every post in full, with absolute URLs and its tags', () => {
    const feed = built('rss.xml')
    assert.match(feed, /^<\?xml version="1.0" encoding="UTF-8"\?><rss version="2.0"/)
    assert.equal(feed.match(/<item>/g)?.length, 4)
    assert.match(feed, /<link>https:\/\/blog\.example\.com\/introducing-jaab\/<\/link>/)
    assert.match(feed, /<category>jaab<\/category><category>release<\/category>/)
    // The local image, rendered as on the page and then made absolute.
    assert.match(feed, /src=&quot;https:\/\/blog\.example\.com\/_astro\/index\.[^&]+\.webp&quot;/)
    assert.doesNotMatch(feed, /__ASTRO_IMAGE_/)
})

test('every page links the feed: in the head, the header and the footer', () => {
    for (const name of ['index.html', 'introducing-jaab/index.html', '404.html']) {
        const html = built(name)
        assert.match(
            html,
            /<link rel="alternate" type="application\/rss\+xml" title="Fixture blog" href="\/rss\.xml">/,
            name,
        )
        assert.match(html, /<a href="\/rss\.xml" class="site-icon-button" aria-label="RSS feed"/, name)
        assert.match(
            html,
            /Built with <a href="https:\/\/docs\.jaamd\.org\/jaab" rel="noopener">JAAB<\/a> · <a href="\/rss\.xml">RSS feed<\/a>/,
            name,
        )
    }
})

test('the blog has no search', () => {
    assert.doesNotMatch(built('index.html'), /<site-search/)
    assert.equal(existsSync(join(DIST, 'search-index.json')), false)
})

test('each post has its Markdown, and llms.txt lists them', () => {
    assert.match(built('introducing-jaab.md'), /^# Introducing JAAB/)
    const llms = built('llms.txt')
    assert.match(llms, /^# Fixture blog\n\n> Build fixture for the jaab package tests\./)
    assert.match(llms, /- \[Moving every site to oxlint\]\(https:\/\/blog\.example\.com\/oxlint\.md\): One linter/)
    assert.match(built('llms-full.txt'), /Source: https:\/\/blog\.example\.com\/introducing-jaab\.md/)
})

test('the 404 is the blog’s, mounted at the root', () => {
    assert.match(built('404.html'), /class="site-not-found/)
})

test('no page links to a file the build did not write', () => {
    assert.deepEqual(brokenLinks(DIST), [])
})

test('every class of the blog has a rule in the built CSS', () => {
    const classes = packageClasses(join(ROOT, 'src'))
    assert.ok(classes.size > 0, 'no classes found; did the source move?')
    assert.deepEqual(missingFrom(allCss(DIST), classes), [])
})

// Components stay semantic: styling lives in CSS, not in utilities.
test('the blog writes only blog-*, site-* and docs-* classes', () => {
    const utilities = [...packageClasses(join(ROOT, 'src'))].filter((name) => {
        return !/^(blog-|site-|docs-)/.test(name)
    })
    assert.deepEqual(utilities, [])
})
