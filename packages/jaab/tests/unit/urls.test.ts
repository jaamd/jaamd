import assert from 'node:assert/strict'
import { test } from 'node:test'
import { blogFileHref, blogPageHref, indexPageHref } from '../../src/urls.ts'

test('a post is below the mount, with the slash Astro builds', () => {
    assert.equal(blogPageHref('hello', { base: '/blog', trailingSlash: true }), '/blog/hello/')
    assert.equal(blogPageHref('hello', { base: '', trailingSlash: false }), '/hello')
    assert.equal(blogPageHref('', { base: '' }), '/')
})

test('the first index page is the index itself', () => {
    const urls = { base: '/blog', trailingSlash: true }
    assert.equal(indexPageHref(1, urls), '/blog/')
    assert.equal(indexPageHref(2, urls), '/blog/page/2/')
})

test('files take the deployment base, and no slash', () => {
    assert.equal(blogFileHref('rss.xml', { base: '/blog', deploymentBase: '/repo/' }), '/repo/blog/rss.xml')
})
