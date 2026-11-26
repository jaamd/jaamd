/** The dev server follows the aliases as the posts change them. */

import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { after, test } from 'node:test'
import { dev } from 'astro'
import jaab from '../../index.ts'
import { inline, project, removeProjects } from './projects.mjs'

const POST = '---\ndate: 2026-11-25\n---\n\n# Moved\n'

after(() => {
    removeProjects()
})

/** Where `path` redirects, or its status when it does not. */
async function locationOf(base, path) {
    const response = await fetch(new URL(path, base), { redirect: 'manual' })
    return response.headers.get('location') ?? response.status
}

/** `check` until it holds, while the server restarts; false after `timeout`. */
async function eventually(check, timeout = 15_000) {
    const end = Date.now() + timeout
    while (Date.now() < end) {
        try {
            if (await check()) {
                return true
            }
        } catch {
            // The server is restarting.
        }
        await new Promise((resolve) => {
            setTimeout(resolve, 200)
        })
    }
    return false
}

test('an alias added to a post redirects without restarting the server by hand', async () => {
    const root = project({ 'blog/moved.md': POST })
    const server = await dev(inline(root, jaab({ title: 'Blog' }), { server: { port: 4517 } }))

    try {
        const base = `http://localhost:${server.address.port}`
        assert.equal(await locationOf(base, '/old/'), 404)

        writeFileSync(join(root, 'blog/moved.md'), POST.replace('---\n\n', 'aliases: [old]\n---\n\n'))
        const followed = await eventually(async () => {
            return (await locationOf(base, '/old/')) === '/moved/'
        })
        assert.ok(followed, '/old/ never redirected to /moved/')
    } finally {
        await server.stop()
    }
})
