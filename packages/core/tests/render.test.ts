/** The HTML the plugins write as strings: whatever an author types stays text. */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { codeTabsHtml, headingLinkHtml, tocOpenHtml } from '../src/render.ts'

const HOSTILE = `"><script>alert('x')</script>&`

/** Every attribute value, as written between double quotes. */
const attributes = (html: string) =>
    [...html.matchAll(/\s[\w-]+="([^"]*)"/g)].map((match) => {
        return match[1]
    })

test('a heading link escapes its id and its accessible name', () => {
    const html = headingLinkHtml(HOSTILE, HOSTILE, 'Link to section')

    assert.doesNotMatch(html, /<script/)
    for (const value of attributes(html)) {
        assert.doesNotMatch(value, /[<>]/, value)
    }
    assert.match(html, /aria-label="Link to section: &quot;&gt;&lt;script&gt;/)
})

test('a table of contents escapes its title and its name', () => {
    const titled = tocOpenHtml(HOSTILE, 'Contents')
    assert.doesNotMatch(titled, /<script/)
    assert.match(titled, /<p class="jaamd-toc-title">&quot;&gt;&lt;script&gt;/)

    const untitled = tocOpenHtml('', HOSTILE)
    assert.doesNotMatch(untitled, /<script/)
    assert.match(untitled, /aria-label="&quot;&gt;&lt;script&gt;/)
})

test('code tab labels are text', () => {
    const tabs = codeTabsHtml('jaamd-tabs-x', [HOSTILE, 'pnpm'])
    assert.doesNotMatch(tabs.open, /<script/)
    assert.match(tabs.open, /&lt;script&gt;alert\(&#39;x&#39;\)&lt;\/script&gt;&amp;/)
})
