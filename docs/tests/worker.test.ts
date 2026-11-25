import assert from 'node:assert/strict'
import { test } from 'node:test'
import worker, { markdownSource, MOVED, movedTo } from '../worker.ts'

const FILES: Record<string, string> = {
    '/jaad/getting-started/installation/': '<html>installation</html>',
    '/jaad/getting-started/installation.md': '# Installation',
    '/jaad/overview.md': '# JAAD',
    '/jaamd/overview.md': '# JAAMD',
    '/welcome.md': '# Welcome to JAAMD',
    '/search-index.json': '{}',
}

/** Every url the Worker asked the assets for. */
const fetched: string[] = []

const env = {
    ASSETS: {
        async fetch(input: Request | URL | string) {
            const url = new URL(input instanceof Request ? input.url : input)
            fetched.push(url.href)

            const body = FILES[url.pathname] ?? FILES[`${url.pathname}/`]
            if (body === undefined) {
                return new Response('<html>404</html>', { status: 404, headers: { 'Content-Type': 'text/html' } })
            }
            const type = url.pathname.endsWith('.json') ? 'application/json' : 'text/html'
            return new Response(body, { headers: { 'Content-Type': type, Vary: 'Accept-Encoding' } })
        },
    },
}

const get = (path: string, accept = 'text/html', method = 'GET') => {
    return worker.fetch(new Request(`https://docs.jaamd.org${path}`, { method, headers: { Accept: accept } }), env)
}

test('a browser gets the HTML page, varying on Accept as well', async () => {
    const response = await get('/jaad/getting-started/installation/', 'text/html,application/xhtml+xml,*/*;q=0.8')
    assert.equal(await response.text(), '<html>installation</html>')
    assert.equal(response.headers.get('Vary'), 'Accept-Encoding, Accept')
})

test('a client that takes anything gets the HTML page', async () => {
    assert.equal(await (await get('/jaad/getting-started/installation/', '*/*')).text(), '<html>installation</html>')
})

test('an agent asking for Markdown gets the page source', async () => {
    const response = await get('/jaad/getting-started/installation', 'text/markdown, text/html;q=0.5')
    assert.equal(response.status, 200)
    assert.equal(response.headers.get('Content-Type'), 'text/markdown; charset=utf-8')
    assert.equal(await response.text(), '# Installation')
})

test('a HEAD request for Markdown is answered as Markdown', async () => {
    const response = await get('/jaad/getting-started/installation', 'text/markdown', 'HEAD')
    assert.equal(response.status, 200)
    assert.equal(response.headers.get('Content-Type'), 'text/markdown; charset=utf-8')
})

test('a path that starts with // is looked up on this site, not on another host', async () => {
    fetched.length = 0
    await get('//evil.example/page', 'text/markdown')

    assert.ok(fetched.length > 0)
    assert.deepEqual(
        fetched.filter((url) => {
            return new URL(url).host !== 'docs.jaamd.org'
        }),
        [],
    )
})

test('the opening pages map to their own Markdown', async () => {
    assert.equal(await (await get('/', 'text/markdown')).text(), '# Welcome to JAAMD')
    assert.equal(await (await get('/jaamd/', 'text/markdown')).text(), '# JAAMD')
    assert.equal(await (await get('/jaad', 'text/markdown')).text(), '# JAAD')
})

test('files keep their own type when Markdown is preferred', async () => {
    assert.equal(markdownSource('/search-index.json'), null)
    const response = await get('/search-index.json', 'text/markdown')
    assert.equal(response.headers.get('Content-Type'), 'application/json')
    assert.equal(await response.text(), '{}')
})

test('a missing page answers an agent in Markdown, its path as code', async () => {
    const response = await get('/jaad/missing', 'text/markdown')
    assert.equal(response.status, 404)
    assert.equal(response.headers.get('Content-Type'), 'text/markdown; charset=utf-8')
    assert.match(await response.text(), /^# Not found[\s\S]*`\/jaad\/missing`[\s\S]*\/llms\.txt/)
})

test('a moved page redirects to its new url, query kept', async () => {
    const response = await get('/jaad/configurations/structure/?q=x')
    assert.equal(response.status, 301)
    assert.equal(response.headers.get('Location'), 'https://docs.jaamd.org/jaad/getting-started/pages/?q=x')
})

test('the Markdown of a moved page redirects to the new Markdown', () => {
    assert.equal(movedTo('/jaad/markdown.md'), '/jaamd/markdown.md')
    assert.equal(movedTo('/jaad/getting-started/installation'), null)
})

test('no moved page points at another moved page', () => {
    for (const target of Object.values(MOVED)) {
        assert.equal(MOVED[target], undefined, target)
    }
})
