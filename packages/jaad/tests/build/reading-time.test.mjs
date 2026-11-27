/** The minutes to read a page: shown only when asked, after the authors. */

import assert from 'node:assert/strict'
import { after, before, describe, test } from 'node:test'
import { build } from 'astro'
import jaad from '../../index.ts'
import { built, inline, project, removeProjects } from './projects.mjs'

const DOCS = {
    'docs/01-long.md': `---\nauthors: Ada Lovelace\n---\n\n# Long\n\n${'word '.repeat(450)}\n`,
    'docs/02-short.md': '# Short\n\nA few words.\n',
}

after(removeProjects)

const buildWith = async (options) => {
    const root = project(DOCS)
    await build(inline(root, jaad({ title: 'Reading', ...options })))
    return built(root)
}

test('a page shows no reading time unless asked', async () => {
    const site = await buildWith({})
    assert.doesNotMatch(site.read('index.html'), /min read/)
    assert.doesNotMatch(site.read('short/index.html'), /docs-page-meta/)
})

describe('with readingTime', () => {
    let site

    before(async () => {
        site = await buildWith({ readingTime: true })
    })

    test('the minutes follow the authors above the title', () => {
        assert.match(
            site.read('index.html'),
            /<p class="docs-page-meta"><span>Ada Lovelace<\/span><span aria-hidden="true">·<\/span><span>3 min read<\/span><\/p>/,
        )
    })

    test('a page without authors shows the minutes alone', () => {
        assert.match(site.read('short/index.html'), /<p class="docs-page-meta"><span>1 min read<\/span><\/p>/)
    })
})
