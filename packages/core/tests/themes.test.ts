/** The theme contract. A theme that omits a token still builds; the defect only
 *  shows up on screen. */

import assert from 'node:assert/strict'
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, test } from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { bundledThemes } from 'shiki'
import { render, TOKENS } from '../scripts/themes.mjs'
import { REQUIRED_TOKENS, themes } from '../src/themes/index.ts'

const LEVELS = ['recessed', 'base', 'surface', 'overlay', 'text', 'bright', 'primary', 'primaryLight', 'accent']
const ALERTS = ['note', 'tip', 'important', 'warning', 'caution']

const THEMES = fileURLToPath(new URL('../src/themes', import.meta.url))

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

            const declares = (block: string, token: string) => new RegExp(`^\\s*${token}\\s*:`, 'm').test(block)
            const missing = blocks.flatMap((block) => [
                ...REQUIRED_TOKENS.filter((token) => !declares(block, token)),
                ...TOKENS.map((token: string) => `--jaamd-${token}`).filter((token: string) => !declares(block, token)),
            ])
            assert.deepEqual([...new Set(missing)], [])

            // A dual theme already covers dark mode: it has no /dark variant.
            assert.equal(dark === null, dual)
        })
    })
}
