/** The classes in `markup.ts` and the selectors of the stylesheet are one list. */

import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { CLASS } from '../src/markup.ts'

const PARTS = fileURLToPath(new URL('../src/styles/parts', import.meta.url))
const css = readdirSync(PARTS)
    .map((file) => readFileSync(join(PARTS, file), 'utf8'))
    .join('\n')
    // Comments name classes too.
    .replace(/\/\*[\s\S]*?\*\//g, '')

const styled = new Set([...css.matchAll(/\.((?:jaamd|markdown-alert)[\w-]*)/g)].map((m) => m[1]))
const declared = new Set<string>(Object.values(CLASS))

test('the stylesheet styles no class the contract does not declare', () => {
    const alertTypes = /^markdown-alert-(note|tip|important|warning|caution)$/
    const unknown = [...styled].filter((name) => !declared.has(name) && !alertTypes.test(name))
    assert.deepEqual(unknown, [])
})

test('every declared class has a rule', () => {
    // Styled through their button, or carried for other stylesheets.
    const unstyled = new Set<string>([CLASS.alertIcon])
    const missing = [...declared].filter((name) => !styled.has(name) && !unstyled.has(name))
    assert.deepEqual(missing, [])
})

test('no selector is left without the jaamd prefix', () => {
    const bare = [...css.matchAll(/[\s&>+~(]\.([a-z][\w-]*)/g)]
        .map((m) => m[1])
        .filter((name) => !/^(jaamd|markdown-alert|octicon|astro-code|shiki|footnotes|data-footnote)/.test(name))
    assert.deepEqual([...new Set(bare)], [])
})
