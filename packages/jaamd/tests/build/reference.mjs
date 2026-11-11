#!/usr/bin/env node
/**
 * Compares the built fixture with the committed reference: the page's HTML and
 * the stylesheets it links.
 *
 * Usage: node tests/build/reference.mjs <satteri|unified> [--update]
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIST = fileURLToPath(new URL('../fixture/dist', import.meta.url))
const REFERENCE = fileURLToPath(new URL('./reference', import.meta.url))

const [processor, flag] = process.argv.slice(2)
if (processor !== 'satteri' && processor !== 'unified') {
    console.error('usage: node tests/build/reference.mjs <satteri|unified> [--update]')
    process.exit(1)
}

const PAGE = join(DIST, 'index.html')
if (!existsSync(PAGE)) {
    console.error(`✗ built page not found: ${PAGE}`)
    process.exit(1)
}

/** Bundled asset names carry content hashes and chunk names. */
const normalize = (text) => text.replace(/\/_astro\/[^"'()\s]+/g, '/_astro/…')

const html = readFileSync(PAGE, 'utf8')
const css = [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g)]
    .map((m) => readFileSync(join(DIST, m[1].replace(/^\//, '')), 'utf8'))
    .join('\n')

const current = { html: normalize(html), css: normalize(css) }

if (flag === '--update') {
    mkdirSync(REFERENCE, { recursive: true })
    for (const [ext, text] of Object.entries(current)) writeFileSync(join(REFERENCE, `${processor}.${ext}`), text)
    console.log(`reference written: ${processor}`)
    process.exit(0)
}

/** Where two texts first differ, with some context. */
function firstDifference(expected, actual) {
    let i = 0
    while (i < expected.length && expected[i] === actual[i]) i++
    const from = Math.max(0, i - 80)
    return `at offset ${i}\n    expected: …${expected.slice(from, i + 80)}…\n    actual:   …${actual.slice(from, i + 80)}…`
}

let failed = false
for (const [ext, text] of Object.entries(current)) {
    const file = join(REFERENCE, `${processor}.${ext}`)
    const expected = existsSync(file) ? readFileSync(file, 'utf8') : null
    if (expected === text) {
        console.log(`✓ ${processor}.${ext} matches the reference`)
        continue
    }
    failed = true
    console.error(
        expected === null
            ? `✗ ${processor}.${ext}: no reference at ${file}`
            : `✗ ${processor}.${ext} differs from the reference ${firstDifference(expected, text)}`,
    )
}

if (failed) process.exit(1)
