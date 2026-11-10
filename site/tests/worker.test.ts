import assert from 'node:assert/strict'
import { test } from 'node:test'
import worker, { markdownSource, quality } from '../worker.ts'

const FILES: Record<string, string> = {
    '/docs/jaad/getting-started/installation/': '<html>installation</html>',
    '/docs/jaad/getting-started/installation.md': '# Installation',
    '/docs/jaad/overview.md': '# Overview',
    '/docs/jaad/search-index.json': '[]',
    '/llms.txt': '# jaamd',
}

const env = {
    ASSETS: {
        async fetch(input: Request | URL | string) {
            const { pathname } = new URL(input instanceof Request ? input.url : input)
            const body = FILES[pathname] ?? FILES[`${pathname}/`]
            return body === undefined
                ? new Response('<html>404</html>', { status: 404, headers: { 'Content-Type': 'text/html' } })
                : new Response(body, { headers: { 'Content-Type': 'text/html' } })
        },
    },
}

const get = (path: string, accept = 'text/html') =>
    worker.fetch(new Request(`https://jaamd.org${path}`, { headers: { Accept: accept } }), env)

test('quality reads q values and defaults to 1', () => {
    assert.equal(quality('text/markdown, text/html;q=0.9', 'text/markdown'), 1)
    assert.equal(quality('text/markdown, text/html;q=0.9', 'text/html'), 0.9)
    assert.equal(quality('text/html', 'text/markdown'), 0)
})

test('/docs redirects permanently to the jaamd documentation', async () => {
    const response = await get('/docs/')
    assert.equal(response.status, 301)
    assert.equal(response.headers.get('Location'), 'https://jaamd.org/docs/jaamd')
})

test('a browser gets the HTML page', async () => {
    const response = await get('/docs/jaad/getting-started/installation/', 'text/html,application/xhtml+xml,*/*;q=0.8')
    assert.equal(await response.text(), '<html>installation</html>')
    assert.equal(response.headers.get('Vary'), 'Accept')
})

test('an agent asking for Markdown gets the page source', async () => {
    const response = await get('/docs/jaad/getting-started/installation', 'text/markdown, text/html;q=0.5')
    assert.equal(response.status, 200)
    assert.equal(response.headers.get('Content-Type'), 'text/markdown; charset=utf-8')
    assert.equal(await response.text(), '# Installation')
})

test('the opening pages map to their own Markdown', async () => {
    assert.equal(await (await get('/docs/jaad', 'text/markdown')).text(), '# Overview')
    assert.equal(await (await get('/docs/jaamd/', 'text/markdown')).text(), '# jaamd')
})

test('files keep their own type when Markdown is preferred', async () => {
    assert.equal(markdownSource('/docs/jaad/search-index.json'), null)
    const response = await get('/docs/jaad/search-index.json', 'text/markdown')
    assert.equal(await response.text(), '[]')
})

test('a missing page answers an agent in Markdown', async () => {
    const response = await get('/docs/jaad/missing', 'text/markdown')
    assert.equal(response.status, 404)
    assert.equal(response.headers.get('Content-Type'), 'text/markdown; charset=utf-8')
    assert.match(await response.text(), /^# Not found/)
})
