#!/usr/bin/env node
/**
 * Builds dist/: the compiled sources, the stylesheet with its parts inlined,
 * the two standalone stylesheets, and every theme from its palette.
 */

import { execFileSync } from 'node:child_process'
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { themes } from '../src/themes/index.ts'
import { render } from './themes.mjs'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const STYLES = join(ROOT, 'src', 'styles')
const DIST = join(ROOT, 'dist')

rmSync(DIST, { recursive: true, force: true })

const tsc = createRequire(import.meta.url).resolve('typescript/bin/tsc')
execFileSync(process.execPath, [tsc, '-p', join(ROOT, 'tsconfig.build.json')], { stdio: 'inherit' })

/** A stylesheet with its `@import './…'` lines replaced by the files they name. */
function inlined(file) {
    return readFileSync(file, 'utf8').replace(/^@import '(\.[^']+)';\n/gm, (_, path) =>
        inlined(join(dirname(file), path)),
    )
}

writeFileSync(join(DIST, 'styles.css'), inlined(join(STYLES, 'index.css')))
copyFileSync(join(STYLES, 'variables.css'), join(DIST, 'default.css'))
copyFileSync(join(STYLES, 'shiki-dual.css'), join(DIST, 'shiki-dual.css'))

for (const { slug } of themes) {
    const { index, dark } = await render(slug)
    const dir = join(DIST, 'themes', slug)
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'index.css'), index)
    if (dark !== null) writeFileSync(join(dir, 'dark.css'), dark)
}
