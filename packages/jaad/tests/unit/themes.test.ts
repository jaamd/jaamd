import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { resolveStylesheets } from '@jaamd/site/config.ts'
import { PRESETS } from '@jaamd/site/themes.ts'
import { bundledThemes } from 'shiki'
import { resolveConfig } from '../../src/config.ts'

const SITE = join(dirname(fileURLToPath(import.meta.url)), '../../../site/src')

test('every preset resolves to a stylesheet JAAMD actually ships', () => {
    for (const name of Object.keys(PRESETS)) {
        if (PRESETS[name].theme === null) {
            continue
        }
        const { theme } = resolveStylesheets(resolveConfig({ title: 'T', theme: name }, '/'), '/')
        assert.ok(theme && existsSync(theme), `${name} points at ${String(theme)}`)
    }
})

test('the default preset ships no stylesheet, so it changes nothing', () => {
    assert.equal(PRESETS.default.theme, null)
})

test('a preset flips the bridge, so the palette travels from JAAMD', () => {
    const config = (theme: string) => {
        return resolveConfig({ title: 'T', theme }, '/')
    }
    const withPreset = resolveStylesheets(config('dracula'), '/')
    const without = resolveStylesheets(config('default'), '/')

    assert.match(withPreset.bridge, /jaamd-reverse\.css$/)
    assert.match(without.bridge, /jaamd-forward\.css$/)
    assert.ok(withPreset.theme, 'a preset must resolve a stylesheet')
    assert.equal(without.theme, null)
})

// The two directions are a cycle if both load, and CSS drops both sides of one.
test('the two bridges never declare the same custom property', () => {
    const declared = (name: string) => {
        return new Set(
            [...readFileSync(join(SITE, 'styles', name), 'utf8').matchAll(/^\s*(--[a-z0-9-]+):/gm)].map((m) => {
                return m[1]
            }),
        )
    }

    const forward = declared('jaamd-forward.css')
    const reverse = declared('jaamd-reverse.css')
    const both = [...forward].filter((token) => {
        return reverse.has(token)
    })

    assert.deepEqual(both, [], 'a token written by both bridges would cycle')
})

// global.css derives everything else from these with color-mix().
test('the reverse bridge covers every seed global.css expects', () => {
    const css = readFileSync(join(SITE, 'styles/jaamd-reverse.css'), 'utf8')

    for (const seed of [
        '--color-background',
        '--color-surface',
        '--color-foreground',
        '--color-foreground-bright',
        '--color-primary',
        '--color-info',
        '--color-success',
        '--color-warning',
        '--color-error',
    ]) {
        assert.match(css, new RegExp(`^\\s*${seed}:`, 'm'), `${seed} is missing`)
    }
})

test('a preset name resolves to its shiki theme', () => {
    assert.equal(resolveConfig({ title: 'T', theme: 'dracula' }, '/').shiki, 'dracula')
    assert.deepEqual(resolveConfig({ title: 'T' }, '/').shiki, {
        light: 'github-light',
        dark: 'github-dark',
    })
})

test('an explicit pair bypasses the presets', () => {
    assert.deepEqual(resolveConfig({ title: 'T', theme: { light: 'a', dark: 'b' } }, '/').shiki, {
        light: 'a',
        dark: 'b',
    })
})

test('an unknown theme is a build error, not a silent fallback', () => {
    assert.throws(
        () => {
            return resolveConfig({ title: 'T', theme: 'solarized' }, '/')
        },
        (e: Error) => {
            return /unknown theme/.test(String(e)) && /dracula/.test(String(e))
        },
    )
})

test('every preset names shiki themes that shiki actually bundles', () => {
    for (const [name, preset] of Object.entries(PRESETS)) {
        const ids = typeof preset.shiki === 'string' ? [preset.shiki] : [preset.shiki.light, preset.shiki.dark]
        for (const id of ids) {
            assert.ok(Object.hasOwn(bundledThemes, id), `${name} asks for "${id}", which shiki does not have`)
        }
    }
})
