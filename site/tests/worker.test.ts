import assert from 'node:assert/strict'
import { test } from 'node:test'
import worker, { movedTo } from '../worker.ts'

const env = {
    ASSETS: {
        async fetch() {
            return new Response('<html>home</html>', { headers: { 'Content-Type': 'text/html' } })
        },
    },
}

const get = (path: string) => worker.fetch(new Request(`https://jaamd.org${path}`), env)

test('the old documentation urls move to docs.jaamd.org', () => {
    assert.equal(movedTo('/docs'), 'https://docs.jaamd.org/jaamd')
    assert.equal(movedTo('/docs/'), 'https://docs.jaamd.org/jaamd')
    assert.equal(movedTo('/docs/jaamd/styling/markup'), 'https://docs.jaamd.org/jaamd/styling/markup')
    assert.equal(
        movedTo('/docs/jaad/getting-started/installation/'),
        'https://docs.jaamd.org/jaad/getting-started/installation/',
    )
    assert.equal(movedTo('/docs/llms.txt'), 'https://docs.jaamd.org/llms.txt')
    assert.equal(movedTo('/jaad'), 'https://docs.jaamd.org/jaad')
})

test('the landing stays here', () => {
    assert.equal(movedTo('/'), null)
    assert.equal(movedTo('/llms.txt'), null)
    assert.equal(movedTo('/docsearch'), null)
    assert.equal(movedTo('/jaadx'), null)
})

test('a moved url answers with a permanent redirect, query kept', async () => {
    const response = await get('/docs/jaad/search?q=x')
    assert.equal(response.status, 301)
    assert.equal(response.headers.get('Location'), 'https://docs.jaamd.org/jaad/search?q=x')
})

test('everything else is served from the build', async () => {
    assert.equal(await (await get('/')).text(), '<html>home</html>')
})
