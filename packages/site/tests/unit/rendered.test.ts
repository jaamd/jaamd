import assert from 'node:assert/strict'
import { test } from 'node:test'
import { pageReadingMinutes, readingMinutes } from '../../src/rendered.ts'

test('reading time is at least a minute, then one per 200 words', () => {
    assert.equal(readingMinutes(''), 1)
    assert.equal(readingMinutes('word '.repeat(200)), 1)
    assert.equal(readingMinutes('word '.repeat(201)), 2)
    // Punctuation on its own is no word.
    assert.equal(readingMinutes(`${'word '.repeat(200)} — — —`), 1)
})

test("a page's reading time counts its text, not its markup", () => {
    const html = `<h1 id="t">Title</h1><p>${'<code>word</code> '.repeat(201)}</p>`
    assert.equal(pageReadingMinutes({ html }), 2)
    assert.equal(pageReadingMinutes(undefined), 1)
})
