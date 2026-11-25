import assert from 'node:assert/strict'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { test } from 'node:test'
import {
    completeManifest,
    devCommand,
    formatManifest,
    missingAnswers,
    normaliseDir,
    packageManager,
    parseArgs,
    quoteArg,
    titleFrom,
} from '../lib.mjs'

// ── Arguments ────────────────────────────────────────────────────────────────

test('a bare directory is the target, and the rest keep their defaults', () => {
    const args = parseArgs(['my-docs'])
    assert.equal(args.dir, 'my-docs')
    assert.equal(args.here, false)
    assert.equal(args.install, null)
    assert.equal(args.template, null)
})

test('install and no-install contradict each other', () => {
    assert.throws(() => {
        return parseArgs(['--install', '--no-install'])
    }, /cannot be used together/)
    assert.throws(() => {
        return parseArgs(['--no-install', '--install'])
    }, /cannot be used together/)
})

test('an option that needs a value says so', () => {
    assert.throws(() => {
        return parseArgs(['--title'])
    }, /--title needs a value/)
    assert.throws(() => {
        return parseArgs(['--title', '--here'])
    }, /needs a value/)
})

test('an unknown template names the ones that exist', () => {
    assert.throws(() => {
        return parseArgs(['--template', 'blog'])
    }, /docs, site/)
})

test('--here and a directory are mutually exclusive', () => {
    assert.throws(() => {
        return parseArgs(['--here', 'x'])
    }, /cannot be used together/)
    assert.throws(() => {
        return parseArgs(['a', 'b'])
    }, /only one directory/)
})

test('the -- npm leaves in place is no directory', () => {
    const args = parseArgs(['my-docs', '--', '--template', 'site'])
    assert.equal(args.dir, 'my-docs')
    assert.equal(args.template, 'site')
})

// ── The current directory, however it is spelled ─────────────────────────────

test('every spelling of the current directory becomes --here', () => {
    for (const dir of ['.', './', './/', resolve('.')]) {
        const args = normaliseDir({ dir, here: false })
        assert.equal(args.here, true, dir)
        assert.equal(args.dir, null, dir)
    }
})

test('a real directory is left alone', () => {
    const args = normaliseDir({ dir: 'my-docs', here: false })
    assert.equal(args.here, false)
    assert.equal(args.dir, 'my-docs')
})

test('a typed directory loses its spaces and expands ~', () => {
    assert.equal(normaliseDir({ dir: '  my-docs ', here: false }).dir, 'my-docs')
    assert.equal(normaliseDir({ dir: '~/my-docs', here: false }).dir, join(homedir(), 'my-docs'))
    assert.equal(normaliseDir({ dir: '   ', here: false }).dir, null)
})

test('the flag path normalises the same way', () => {
    assert.equal(parseArgs(['./']).here, true)
    assert.equal(parseArgs(['./']).dir, null)
})

// ── Presentation ─────────────────────────────────────────────────────────────

test('a package name becomes a title worth offering', () => {
    assert.equal(titleFrom('my-docs'), 'My Docs')
    assert.equal(titleFrom('@acme/my-library'), 'My Library')
    assert.equal(titleFrom('docs.site_name'), 'Docs Site Name')
    assert.equal(titleFrom(''), 'Documentation')
})

test('a path is quoted only when a shell would need it', () => {
    assert.equal(quoteArg('my-docs'), 'my-docs')
    assert.equal(quoteArg('./a/b@c'), './a/b@c')
    assert.equal(quoteArg('my docs'), '"my docs"')
    assert.equal(quoteArg('a"b'), '"a\\"b"')
})

test('the package manager comes from the agent that invoked us', () => {
    const agent = process.env.npm_config_user_agent
    try {
        for (const [ua, expected] of [
            ['pnpm/10.0.0 npm/? node/v22', 'pnpm'],
            ['yarn/4.0.0 npm/? node/v22', 'yarn'],
            ['bun/1.0.0', 'bun'],
            ['npm/10.0.0 node/v22', 'npm'],
            ['', 'npm'],
        ]) {
            process.env.npm_config_user_agent = ua
            assert.equal(packageManager(), expected, ua)
        }
    } finally {
        if (agent === undefined) {
            delete process.env.npm_config_user_agent
        } else {
            process.env.npm_config_user_agent = agent
        }
    }
})

// ── The manifest ────────────────────────────────────────────────────────────

const DEPENDENCIES = { dependencies: { astro: '^7', '@jaamd/jaad': '^1' } }

test('a new manifest is a private ES module with the scripts and dependencies', () => {
    assert.deepEqual(completeManifest(null, { name: 'my-docs', ...DEPENDENCIES }), {
        name: 'my-docs',
        private: true,
        type: 'module',
        scripts: { dev: 'astro dev', build: 'astro build', preview: 'astro preview' },
        dependencies: { astro: '^7', '@jaamd/jaad': '^1' },
    })
})

test('an existing manifest keeps its scripts in place and gains the missing ones after them', () => {
    const existing = { name: 'lib', scripts: { test: 'node --test', build: 'tsc' } }
    const manifest = completeManifest(existing, DEPENDENCIES)

    assert.deepEqual(Object.entries(manifest.scripts), [
        ['test', 'node --test'],
        ['build', 'tsc'],
        ['dev', 'astro dev'],
        ['preview', 'astro preview'],
    ])
    assert.equal(manifest.type, undefined)
    assert.deepEqual(existing.scripts, { test: 'node --test', build: 'tsc' }, 'the input was changed')
})

test('a dependency declared anywhere is not added again', () => {
    const existing = {
        scripts: { dev: 'astro dev', build: 'astro build', preview: 'astro preview' },
        devDependencies: { astro: '^7.3.1', '@jaamd/jaad': '^0.6.1' },
    }
    assert.deepEqual(completeManifest(existing, DEPENDENCIES), existing)
})

test('the manifest keeps the indentation of the file it replaces', () => {
    assert.equal(formatManifest({ a: 1 }), '{\n  "a": 1\n}\n')
    assert.equal(formatManifest({ a: 1 }, '{\n    "name": "x"\n}\n'), '{\n    "a": 1\n}\n')
    assert.equal(formatManifest({ a: 1 }, '{\n\t"name": "x"\n}\n'), '{\n\t"a": 1\n}\n')
})

test('the dev command is the script, unless the script is not Astro', () => {
    assert.equal(devCommand('npm'), 'npm run dev')
    assert.equal(devCommand('pnpm', { dev: 'astro dev --port 4000' }), 'pnpm run dev')
    assert.equal(devCommand('npm', { dev: 'vite' }), 'npx astro dev')
    assert.equal(devCommand('pnpm', { dev: 'vite' }), 'pnpm exec astro dev')
})

// ── Non-interactive completeness ─────────────────────────────────────────────

test('a non-interactive run is told everything it still needs', () => {
    const missing = missingAnswers({
        here: false,
        dir: null,
        title: null,
        install: null,
    })
    assert.equal(missing.length, 3)

    assert.deepEqual(missingAnswers({ here: true, dir: null, title: 'T', install: false }), [])
})
