#!/usr/bin/env node
/**
 * Stylesheets here are bridges: one `@import` of the `@jaamd/core` file each,
 * so a project reaches them without declaring core.
 *
 * `--check` verifies the committed files instead of writing them.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { themes } from '@jaamd/core/themes'

const SRC = fileURLToPath(new URL('../src', import.meta.url))
const require = createRequire(import.meta.url)

const inCore = (specifier) => {
    try {
        require.resolve(specifier)
        return true
    } catch {
        return false
    }
}

/** Bridge path under src/, and the core specifier it imports. */
const bridges = [
    ['styles/variables.css', '@jaamd/core/default.css'],
    ['styles/markdown.css', '@jaamd/core/styles.css'],
    ['styles/shiki-dual.css', '@jaamd/core/shiki-dual.css'],
    ...themes.flatMap(({ slug }) => [
        [`themes/${slug}/index.css`, `@jaamd/core/themes/${slug}.css`],
        // Single-palette themes only.
        ...(inCore(`@jaamd/core/themes/${slug}/dark.css`)
            ? [[`themes/${slug}/dark.css`, `@jaamd/core/themes/${slug}/dark.css`]]
            : []),
    ]),
]

const check = process.argv.includes('--check')
const stale = []

for (const [relative, specifier] of bridges) {
    const path = join(SRC, relative)
    const content = `@import '${specifier}';\n`

    if (check) {
        if (!existsSync(path) || readFileSync(path, 'utf8') !== content) stale.push(relative)
        continue
    }

    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, content)
}

if (stale.length > 0) {
    console.error(`✗ stale: ${stale.join(', ')}\n  Run \`pnpm build:themes\` and commit the result.`)
    process.exit(1)
}

console.log(`${check ? '✓' : 'wrote'} ${bridges.length} bridge stylesheet(s)`)
