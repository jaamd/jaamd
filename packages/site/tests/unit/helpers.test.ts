import assert from 'node:assert/strict'
import { test } from 'node:test'
import { escapeHtml, fill, scriptJson } from '../../src/helpers.ts'

test('JSON for a script element cannot close it, and reads back unchanged', () => {
    const data = { headline: 'Avoid </script><img src=x onerror=alert(1)> in titles' }
    const json = scriptJson(data)

    assert.doesNotMatch(json, /<\/script/i)
    assert.doesNotMatch(json, /</)
    assert.deepEqual(JSON.parse(json), data)
})

test('escaped text cannot open a tag or leave an attribute', () => {
    assert.equal(escapeHtml(`a "b" & <c> 'd'`), 'a &quot;b&quot; &amp; &lt;c&gt; &#39;d&#39;')
})

test('a UI string takes its values by name, and keeps a placeholder it is not given', () => {
    assert.equal(fill('Page {page} of {pages}', { page: 2, pages: 5 }), 'Page 2 of 5')
    assert.equal(fill('{minutes} min read, {unknown}', { minutes: 3 }), '3 min read, {unknown}')
})
