/** The theme contract. A theme that omits a token still builds; the defect only
 *  shows up on screen. */

import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, test } from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { bundledThemes } from 'shiki'
import { render } from '../scripts/themes.mjs'
import { REQUIRED_TOKENS, themes } from '../src/themes/index.ts'

const LEVELS = ['recessed', 'base', 'surface', 'overlay', 'text', 'bright', 'primary', 'primaryLight', 'accent']
const ALERTS = ['note', 'tip', 'important', 'warning', 'caution']

const THEMES = fileURLToPath(new URL('../src/themes', import.meta.url))

/** The light defaults: every variable JAAMD reads, and how it gets its value. */
const DEFAULTS = (() => {
    const css = readFileSync(fileURLToPath(new URL('../src/styles/variables.css', import.meta.url)), 'utf8')
    const light = css.slice(0, css.indexOf('html.dark'))
    const declarations = [...light.matchAll(/^\s*(--jaamd-[a-z0-9-]+)\s*:\s*([^;]+);/gm)].map((match) => {
        return [match[1], match[2].trim()] as const
    })
    return new Map(declarations)
})()

/** The custom properties a block declares. */
const declared = (block: string) =>
    [...block.matchAll(/^\s*(--[a-z0-9-]+)\s*:/gm)].map((match) => {
        return match[1]
    })

test('the tokens a theme must declare are the seeds the defaults derive from', () => {
    const notSeeds = REQUIRED_TOKENS.filter((token) => {
        const value = DEFAULTS.get(token)
        return value === undefined || /var\(|color-mix\(/.test(value)
    })
    assert.deepEqual(notSeeds, [])
})

const directories = readdirSync(THEMES, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .toSorted()

test('every directory is declared in the manifest, and every entry has a directory', () => {
    assert.deepEqual(themes.map((theme) => theme.slug).toSorted(), directories)
})

for (const theme of themes) {
    describe(theme.slug, () => {
        const dual = theme.mode === 'dual'

        test('pairs with Shiki themes that exist, two for a dual palette', () => {
            const shiki = typeof theme.shiki === 'string' ? [theme.shiki] : Object.values(theme.shiki)
            assert.deepEqual(
                shiki.filter((name) => !Object.hasOwn(bundledThemes, name)),
                [],
            )
            assert.equal(shiki.length, dual ? 2 : 1)
        })

        test('its palette declares every level, for the modes it covers', async () => {
            const path = join(THEMES, theme.slug, 'palette.js')
            assert.ok(existsSync(path), 'the CSS is generated from a palette')

            const palette = (await import(pathToFileURL(path).href)).default
            const sets = [palette.light, palette.dark].filter(Boolean)
            assert.equal(sets.length, dual ? 2 : 1)

            const gaps = sets.flatMap((set) => [
                ...LEVELS.filter((level) => !set[level]),
                ...ALERTS.filter((kind) => !set.alert?.[kind]).map((kind) => `alert.${kind}`),
            ])
            assert.deepEqual([...new Set(gaps)], [])
        })

        test('its stylesheet declares the whole token set in every block', async () => {
            const { index, dark } = await render(theme.slug)
            // A dual theme carries the seeds in both blocks; otherwise one mode
            // borrows the other's background.
            const blocks = dual ? index.split(/^html\.dark \{$/m) : [index]
            assert.equal(blocks.length, dual ? 2 : 1)

            const missing = blocks.flatMap((block) => {
                return REQUIRED_TOKENS.filter((token) => !declared(block).includes(token))
            })
            assert.deepEqual([...new Set(missing)], [])

            // A misspelt or retired name would build, and change nothing on screen.
            const unknown = blocks.flatMap((block) => {
                return declared(block).filter((token) => !DEFAULTS.has(token))
            })
            assert.deepEqual([...new Set(unknown)], [])

            // A dual theme already covers dark mode: it has no /dark variant.
            assert.equal(dark === null, dual)
        })
    })
}
