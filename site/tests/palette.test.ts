import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

/** The custom properties of the first block that `selector` opens, prefixes
 *  dropped: `--identity-border`, `--color-border` and `--jaad-content-width`
 *  become `border` and `content-width`. */
function tokens(file: string, selector: string): Map<string, string> {
    const source = readFileSync(join(ROOT, file), 'utf8')
    const start = source.indexOf(`${selector} {`)
    assert.ok(start >= 0, `${file} has no ${selector} block`)
    const block = source.slice(start, source.indexOf('\n}', start))

    const declarations = [...block.matchAll(/(--[a-z-]+):\s*([^;]+);/g)].map((match) => {
        const name = match[1].replace(/^--(?:identity|color|jaad)-/, '').replace(/^--/, '')
        const value = match[2].replace(/\s+/g, ' ').replace(/--(?:identity|color)-/g, '--')
        return [name, value] as const
    })
    return new Map(declarations)
}

// jaamd.org keeps its own palette, so nothing forces it to agree with JAAD's,
// which docs.jaamd.org uses. If they drift, the two stop looking like one site.
for (const [mode, selectors] of [
    ['light', [':root', '@theme static']],
    ['dark', ['html.dark', 'html.dark']],
] as const) {
    test(`the site's ${mode} palette is JAAD's`, () => {
        const site = tokens('site/src/styles/identity.css', selectors[0])
        const jaad = tokens('packages/site/src/styles/global.css', selectors[1])

        assert.ok(site.size > 0, 'no tokens found in the site')
        const differing = [...site]
            .filter(([name, value]) => {
                return jaad.get(name) !== value
            })
            .map(([name, value]) => {
                return `${name}: ${value} (JAAD: ${jaad.get(name) ?? 'none'})`
            })
        assert.deepEqual(differing, [])
    })
}
