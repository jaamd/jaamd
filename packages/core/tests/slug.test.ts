/** `slugify()` fills in ids for headings that arrived without one. Astro's own
 *  ids come from `github-slugger`, so the two have to agree. */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import Slugger from 'github-slugger'
import { slugify } from '../src/client/dom.ts'

const cases = [
    'Feature Demo',
    // One dash per space; the slash goes, the spaces stay.
    'Details / accordion',
    // Underscores are kept.
    'my_heading',
    "What's new?",
    'C++ & Rust',
    'Hello 🎉 World',
    'Table (v2) — notes',
    '100% done',
    '@media queries',
    'dot.case.name',
    // `\w` would collapse these to "".
    'Заголовок раздела',
    '日本語の見出し',
    'Ünicode Ärger',
    // No trimming at either end.
    '  padded  ',
    'trailing dash -',
]

for (const text of cases) {
    test(`slug of ${JSON.stringify(text)} matches github-slugger`, () => {
        assert.equal(slugify(text), new Slugger().slug(text))
    })
}
