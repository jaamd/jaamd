import assert from 'node:assert/strict'
import { test } from 'node:test'
import { absoluteUrls, withoutTitle } from '../../src/model/html.ts'

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
