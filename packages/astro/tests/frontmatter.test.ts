import assert from 'node:assert/strict'
import { test } from 'node:test'
import { z } from 'astro/zod'
import { frontmatterFields } from '../src/frontmatter.ts'

const schema = z.object(frontmatterFields(z))
const ogImage = (value: unknown) => schema.safeParse({ ogImage: value }).success

test('ogImage takes a root-relative path, an http(s) URL or false', () => {
    assert.equal(ogImage('/og/page.png'), true)
    assert.equal(ogImage('https://cdn.example.dev/page.png'), true)
    assert.equal(ogImage(false), true)
})

test('ogImage refuses a protocol-relative URL and a relative path', () => {
    assert.equal(ogImage('//evil.example/page.png'), false)
    assert.equal(ogImage('og/page.png'), false)
})
