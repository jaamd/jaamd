import assert from 'node:assert/strict'
import { test } from 'node:test'
import { aliasRedirects, findTrespasses, getInjectedRoutes } from '../../src/integration.ts'

const post = (file: string, slug: string, aliases: string[] = []) => {
    return { file, slug, data: { aliases } }
}

const patterns = (routes: [string, string][]) => {
    return routes.map(([pattern]) => {
        return pattern
    })
}

test('the routes follow the feed and the llms files', () => {
    assert.deepEqual(patterns(getInjectedRoutes('/blog', { llms: true, rootLlms: true, feed: true })), [
        '/blog',
        '/blog/page/[page]',
        '/blog/rss.xml',
        '/blog/llms.txt',
        '/blog/llms-full.txt',
        '/blog/[...slug]',
        '/blog/[...slug].md',
    ])
    assert.deepEqual(patterns(getInjectedRoutes('/blog', { llms: false, rootLlms: true, feed: false })), [
        '/blog',
        '/blog/page/[page]',
        '/blog/[...slug]',
    ])
})

test('at the root, the site may serve the llms files in place of the blog', () => {
    const routes = patterns(getInjectedRoutes('', { llms: true, rootLlms: false, feed: true }))
    assert.deepEqual(routes, ['', '/page/[page]', '/rss.xml', '/[...slug]', '/[...slug].md'])
})

test("a post or an alias inside another package's pages is found, with its file", () => {
    const posts = [
        post('blog/hello.md', 'hello'),
        post('blog/docs/setup.md', 'docs/setup'),
        post('blog/moved.md', 'moved', ['docs']),
        post('blog/docsy.md', 'docsy'),
    ]
    assert.deepEqual(findTrespasses(posts, [{ path: 'docs', package: '@jaamd/jaad' }]), [
        'blog/docs/setup.md would be served at /docs/setup, which @jaamd/jaad serves',
        'blog/moved.md would be served at /docs, which @jaamd/jaad serves',
    ])
})

// Astro puts the deployment base before the source of a redirect, not before its target.
test('an alias redirects to its post, the deployment base on the target only', () => {
    const posts = [post('blog/new.md', 'new', ['/old/address/', 'older'])]
    assert.deepEqual(aliasRedirects(posts, { base: '/blog', deploymentBase: '/repo', trailingSlash: true }), {
        '/blog/old/address': '/repo/blog/new/',
        '/blog/older': '/repo/blog/new/',
    })
})
