import assert from 'node:assert/strict'
import { test } from 'node:test'
import worker, { markdownSource, quality } from '../worker.ts'

const FILES: Record<string, string> = {
    '/jaad/getting-started/installation/': '<html>installation</html>',
    '/jaad/getting-started/installation.md': '# Installation',
    '/jaad/overview.md': '# JAAD',
    '/jaamd/overview.md': '# JAAMD',
    '/welcome.md': '# Welcome to JAAMD',
    '/search-index.json': '{}',
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
    worker.fetch(new Request(`https://docs.jaamd.org${path}`, { headers: { Accept: accept } }), env)

test('quality reads q values and defaults to 1', () => {
    assert.equal(quality('text/markdown, text/html;q=0.9', 'text/markdown'), 1)
    assert.equal(quality('text/markdown, text/html;q=0.9', 'text/html'), 0.9)
    assert.equal(quality('text/html', 'text/markdown'), 0)
})

test('a browser gets the HTML page', async () => {
    const response = await get('/jaad/getting-started/installation/', 'text/html,application/xhtml+xml,*/*;q=0.8')
    assert.equal(await response.text(), '<html>installation</html>')
    assert.equal(response.headers.get('Vary'), 'Accept')
})

test('an agent asking for Markdown gets the page source', async () => {
    const response = await get('/jaad/getting-started/installation', 'text/markdown, text/html;q=0.5')
    assert.equal(response.status, 200)
    assert.equal(response.headers.get('Content-Type'), 'text/markdown; charset=utf-8')
    assert.equal(await response.text(), '# Installation')
})

test('the opening pages map to their own Markdown', async () => {
    assert.equal(await (await get('/', 'text/markdown')).text(), '# Welcome to JAAMD')
    assert.equal(await (await get('/jaamd/', 'text/markdown')).text(), '# JAAMD')
    assert.equal(await (await get('/jaad', 'text/markdown')).text(), '# JAAD')
})

test('files keep their own type when Markdown is preferred', async () => {
    assert.equal(markdownSource('/search-index.json'), null)
    const response = await get('/search-index.json', 'text/markdown')
    assert.equal(await response.text(), '{}')
})

test('a missing page answers an agent in Markdown', async () => {
    const response = await get('/jaad/missing', 'text/markdown')
    assert.equal(response.status, 404)
    assert.equal(response.headers.get('Content-Type'), 'text/markdown; charset=utf-8')
    assert.match(await response.text(), /^# Not found[\s\S]*\/llms\.txt/)
})
