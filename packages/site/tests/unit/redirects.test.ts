import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, test } from 'node:test'
import { pathToFileURL } from 'node:url'
import { serialiseRedirects, setupRedirects, writeIfChanged } from '../../src/redirects.ts'

const scratch = mkdtempSync(join(tmpdir(), 'site-redirects-'))

after(() => {
    rmSync(scratch, { recursive: true, force: true })
})

test('the same redirects read the same, whatever their order', () => {
    assert.equal(serialiseRedirects({ '/b': '/two', '/a': '/one' }), serialiseRedirects({ '/a': '/one', '/b': '/two' }))
})

test('a file is written only when its text changes', () => {
    const file = pathToFileURL(join(scratch, 'written.json'))
    assert.equal(writeIfChanged(file, 'one'), true)
    assert.equal(writeIfChanged(file, 'one'), false)
    assert.equal(writeIfChanged(file, 'two'), true)
})

/** The setup a dev server runs, with what the helper calls recorded. */
function devSetup(command: 'dev' | 'build', read: () => Record<string, string>) {
    const codegen = mkdtempSync(join(scratch, 'codegen-'))
    const calls = { config: [] as unknown[], watched: [] as unknown[] }
    const params = {
        command,
        updateConfig: (config: unknown) => {
            calls.config.push(config)
        },
        addWatchFile: (file: unknown) => {
            calls.watched.push(file)
        },
        createCodegenDir: () => {
            return pathToFileURL(codegen + '/')
        },
    }
    const watch = setupRedirects(params as never, { dirs: [join(scratch, 'blog')], read })
    return { calls, watch, file: join(codegen, 'redirects.json') }
}

test('a build gets the redirects as config, and watches nothing', () => {
    const { calls } = devSetup('build', () => {
        return { '/old': '/new/' }
    })
    assert.deepEqual(calls.config, [{ redirects: { '/old': '/new/' } }])
    assert.deepEqual(calls.watched, [])
})

test('in dev, a markdown change that moves the redirects rewrites the watched file', () => {
    let redirects: Record<string, string> = { '/old': '/new/' }
    const { calls, watch, file } = devSetup('dev', () => {
        return redirects
    })
    assert.equal(calls.watched.length, 1)
    assert.equal(readFileSync(file, 'utf8'), serialiseRedirects(redirects))

    const watcher = new EventEmitter()
    watch({ watcher } as never)

    redirects = { '/old': '/new/', '/older': '/new/' }
    watcher.emit('all', 'change', join(scratch, 'elsewhere', 'post.md'))
    watcher.emit('all', 'change', join(scratch, 'blog', 'style.css'))
    assert.notEqual(readFileSync(file, 'utf8'), serialiseRedirects(redirects), 'a file outside the posts restarted')

    watcher.emit('all', 'change', join(scratch, 'blog', 'post.md'))
    assert.equal(readFileSync(file, 'utf8'), serialiseRedirects(redirects))
})
