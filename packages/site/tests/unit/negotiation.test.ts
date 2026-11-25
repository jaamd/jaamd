import assert from 'node:assert/strict'
import { test } from 'node:test'
import { markdownPathFor, prefersMarkdown, quality } from '../../src/negotiation.ts'

test('quality reads q values, in any case and with spaces, and defaults to 1', () => {
    assert.equal(quality('text/markdown, text/html;q=0.9', 'text/markdown'), 1)
    assert.equal(quality('text/markdown, text/html;q=0.9', 'text/html'), 0.9)
    assert.equal(quality('text/html', 'text/markdown'), 0)
    assert.equal(quality('text/markdown;Q=0.2', 'text/markdown'), 0.2)
    assert.equal(quality('text/markdown; q = 0.3', 'text/markdown'), 0.3)
    assert.equal(quality('text/markdown;q=nope', 'text/markdown'), 0)
})

test('Markdown is preferred only when asked for above HTML', () => {
    const ask = (accept: string) => {
        return prefersMarkdown(new Request('https://d.dev/', { headers: { Accept: accept } }))
    }
    assert.equal(ask('text/markdown, text/html;q=0.5'), true)
    assert.equal(ask('text/html,application/xhtml+xml,*/*;q=0.8'), false)
    assert.equal(ask('*/*'), false)
})

test('a page path gets its Markdown path, a file and an opener their own', () => {
    assert.equal(markdownPathFor('/guides/setup/'), '/guides/setup.md')
    assert.equal(markdownPathFor('/guides/setup'), '/guides/setup.md')
    assert.equal(markdownPathFor('/search-index.json'), null)
    assert.equal(markdownPathFor('/', { '/': '/introduction.md' }), '/introduction.md')
    assert.equal(markdownPathFor('/docs/', { '/docs': '/docs/welcome.md' }), '/docs/welcome.md')
})
