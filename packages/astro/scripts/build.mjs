#!/usr/bin/env node
/**
 * Writes dist/: one stylesheet for each of `@jaamd/core`'s, importing it, at
 * the same path. The project imports them through `@jaamd/astro`, which a
 * strict layout leaves as the only way to reach core.
 */

import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { themes } from '@jaamd/core/themes'

const DIST = fileURLToPath(new URL('../dist', import.meta.url))

/** Path under dist/, and the core specifier it imports. */
const stylesheets = [
    ['default.css', '@jaamd/core/default.css'],
    ['styles.css', '@jaamd/core/styles.css'],
    ['shiki-dual.css', '@jaamd/core/shiki-dual.css'],
    ...themes.flatMap(({ slug, mode }) => [
        [`themes/${slug}/index.css`, `@jaamd/core/themes/${slug}.css`],
        ...(mode === 'dual' ? [] : [[`themes/${slug}/dark.css`, `@jaamd/core/themes/${slug}/dark.css`]]),
    ]),
]

rmSync(DIST, { recursive: true, force: true })

for (const [relative, specifier] of stylesheets) {
    const path = join(DIST, relative)
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, `@import '${specifier}';\n`)
}
