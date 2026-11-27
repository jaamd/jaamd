import assert from 'node:assert/strict'
import { test } from 'node:test'
import { absoluteUrls, feedContent, withoutTitle } from '../../src/model/html.ts'

test('root-relative links, images and srcset candidates become absolute', () => {
    const html =
        '<a href="/post/">a</a><img src="/_astro/a.webp" srcset="/_astro/a.webp 1x, /_astro/b.webp 2x">' +
        '<a href="https://other.dev/">b</a><a href="//cdn.dev/c">c</a><a href="#top">d</a>'
    assert.equal(
        absoluteUrls(html, 'https://example.dev'),
        '<a href="https://example.dev/post/">a</a>' +
            '<img src="https://example.dev/_astro/a.webp" srcset="https://example.dev/_astro/a.webp 1x, https://example.dev/_astro/b.webp 2x">' +
            '<a href="https://other.dev/">b</a><a href="//cdn.dev/c">c</a><a href="#top">d</a>',
    )
})

test('the title a post opens with is taken off, and only that one', () => {
    assert.equal(withoutTitle('\n<h1 id="t">Title</h1><p>Text</p><h1>Later</h1>'), '<p>Text</p><h1>Later</h1>')
    assert.equal(withoutTitle('<p>Text</p><h1>Later</h1>'), '<p>Text</p><h1>Later</h1>')
})

test('a feed carries a post without its title, its heading links and its summary marker', () => {
    const html =
        '<h1>Title</h1><p>Intro.</p>\n<!-- more -->\n' +
        '<h2 id="a">A<a class="jaamd-heading-link" href="#a" aria-label="Link to section: A"><svg><path/></svg></a></h2>' +
        '<p><a class="other" href="/x/">x</a></p>'
    assert.equal(feedContent(html), '<p>Intro.</p>\n<h2 id="a">A</h2><p><a class="other" href="/x/">x</a></p>')
})
