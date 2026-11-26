import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, test } from 'node:test'
import { localDay, newPost, parseArgs, writePost } from '../../bin/new-post.mjs'

const cwd = mkdtempSync(join(tmpdir(), 'jaab-new-'))
// Midday, so the day is the same in every zone the tests may run in.
const TODAY = new Date('2026-11-26T12:00:00Z')

after(() => {
    rmSync(cwd, { recursive: true, force: true })
})

test('a post is named after its title, and dated today', () => {
    const post = newPost(parseArgs(['new', 'Introducing JAAB: a blog']), cwd, TODAY)
    assert.equal(post.file, join(cwd, 'blog', 'introducing-jaab-a-blog.md'))
    assert.equal(post.source, '---\ntitle: "Introducing JAAB: a blog"\ndate: 2026-11-26\n---\n\n')
})

test('--dir makes a directory for the images beside the post', () => {
    const post = newPost(parseArgs(['new', 'Photos', '--dir', '--blog-dir', 'posts']), cwd, TODAY)
    assert.equal(post.file, join(cwd, 'posts', 'photos', 'index.md'))
})

test('an existing post is left alone', () => {
    const post = newPost(parseArgs(['new', 'Twice']), cwd, TODAY)
    assert.equal(writePost(post, cwd), 'Wrote blog/twice.md')
    assert.equal(readFileSync(post.file, 'utf8'), post.source)
    assert.throws(() => {
        return writePost(post, cwd)
    }, /blog\/twice\.md already exists/)
})

test('without a title, or with two, it says how to call it', () => {
    assert.match(parseArgs(['new']).error, /^Usage: jaab new/)
    assert.match(parseArgs(['publish']).error, /^Usage: jaab new/)
    assert.match(parseArgs(['new', 'Hello', 'world']).error, /one title only: quote it, as jaab new "Hello world"/)
    assert.match(parseArgs(['new', 'Hello', '--draft']).error, /unknown option --draft/)
})

test("a post is dated the author's day, not UTC's", () => {
    // Just after midnight, local time: in UTC east of Greenwich, still the day before.
    assert.equal(localDay(new Date(2026, 10, 27, 0, 30)), '2026-11-27')
})
