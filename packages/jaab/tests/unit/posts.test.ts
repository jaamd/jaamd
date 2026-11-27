import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
    comparePosts,
    formatPostDay,
    pageCount,
    pagePosts,
    parsePostDate,
    postErrors,
    postSlug,
    writtenDay,
    type PostFile,
} from '../../src/model/posts.ts'

test('a slug is the file name, without its date prefix', () => {
    assert.equal(postSlug('2026-11-22-introducing-jaab.md'), 'introducing-jaab')
    assert.equal(postSlug('introducing-jaab.md'), 'introducing-jaab')
    assert.equal(postSlug('Hello World.md'), 'hello-world')
})

test('a post with images beside it is named by its directory', () => {
    assert.equal(postSlug('2026-11-22-introducing-jaab/index.md'), 'introducing-jaab')
})

test("the blog's own index.md is no post", () => {
    assert.equal(postSlug('index.md'), null)
})

test('a date is a day, or a time with its offset', () => {
    assert.equal(parsePostDate('2026-11-22')?.toISOString(), '2026-11-22T00:00:00.000Z')
    assert.equal(parsePostDate('2026-11-22T09:30:00+01:00')?.toISOString(), '2026-11-22T08:30:00.000Z')
    assert.equal(parsePostDate(new Date('2026-11-22'))?.toISOString(), '2026-11-22T00:00:00.000Z')
    assert.equal(parsePostDate(new Date('not a day')), null)
})

test('a time without an offset, or words, are no date', () => {
    assert.equal(parsePostDate('2026-11-22T09:30'), null)
    assert.equal(parsePostDate('Nov 22, 2026'), null)
    assert.equal(parsePostDate('2026-13-45'), null)
    // `Date` would roll it over to March 2.
    assert.equal(parsePostDate('2026-02-30'), null)
    assert.equal(parsePostDate(20261122), null)
})

test('a post is dated the day it is written on, whatever the offset', () => {
    assert.equal(writtenDay('2026-11-23T00:30:00+01:00'), '2026-11-23')
    assert.equal(writtenDay('2026-11-22'), '2026-11-22')
    assert.equal(writtenDay(new Date('2026-11-22')), '2026-11-22')
    assert.equal(writtenDay('2026-02-30'), null)
})

test('a day reads the same in every zone', () => {
    assert.equal(formatPostDay('2026-11-22', 'en'), 'Nov 22, 2026')
    assert.equal(formatPostDay('2026-11-22', 'it'), '22 nov 2026')
})

test('posts run newest first, and by slug on the same day', () => {
    const posts = [
        { slug: 'b', date: new Date('2026-11-20') },
        { slug: 'c', date: new Date('2026-11-22') },
        { slug: 'a', date: new Date('2026-11-20') },
    ]
    const order = posts.toSorted(comparePosts).map((post) => {
        return post.slug
    })
    assert.deepEqual(order, ['c', 'a', 'b'])
})

test('the index has one page even without posts, and slices the rest', () => {
    assert.equal(pageCount(0, 10), 1)
    assert.equal(pageCount(10, 10), 1)
    assert.equal(pageCount(11, 10), 2)
    assert.deepEqual(pagePosts([1, 2, 3, 4, 5], 2, 2), [3, 4])
    assert.deepEqual(pagePosts([1, 2, 3, 4, 5], 3, 2), [5])
})

const post = (file: string, data: Record<string, unknown> = {}): PostFile => {
    return { file: `blog/${file}`, slug: postSlug(file)!, data: { date: '2026-11-22', ...data } }
}

const errorsOf = (posts: PostFile[]) => {
    return postErrors(posts)
}

test('well-formed posts pass', () => {
    const posts = [post('a.md', { authors: ['luca'], aliases: ['/old-a/'] }), post('b.md')]
    assert.deepEqual(errorsOf(posts), [])
})

test('a missing or wrong date says how to write one', () => {
    const [missing] = errorsOf([post('a.md', { date: undefined })])
    assert.match(missing, /blog\/a\.md has no date\. Add one to its frontmatter, as date: 2026-11-22\./)

    const [wrong] = errorsOf([post('a.md', { date: 'yesterday' })])
    assert.match(wrong, /blog\/a\.md has the date "yesterday", which is not one\. Write a day/)
})

test('two posts on one slug name both files', () => {
    const [error] = errorsOf([post('2026-01-01-hello.md'), post('hello/index.md')])
    assert.match(error, /blog\/2026-01-01-hello\.md and blog\/hello\/index\.md are both served at \/hello/)
})

test("a post or an alias on one of the blog's routes is refused", () => {
    const [slug] = errorsOf([post('page.md')])
    assert.match(slug, /blog\/page\.md would be served at \/page, a route of the blog's own/)

    const [alias] = errorsOf([post('a.md', { aliases: ['page/2'] })])
    assert.match(alias, /blog\/a\.md has the alias \/page\/2, a route of the blog's own/)
})

test("an empty slug or alias would take the blog's index", () => {
    const [slug] = errorsOf([{ file: 'blog/!!!.md', slug: '', data: { date: '2026-11-22' } }])
    assert.match(slug, /blog\/!!!\.md would be served as the blog's index/)

    const [alias] = errorsOf([post('a.md', { aliases: ['/'] })])
    assert.match(alias, /blog\/a\.md has the alias \/, the blog's index/)
})

test("an alias on another post's address is refused, wherever that post comes", () => {
    const [error] = errorsOf([post('a.md', { aliases: ['/b/'] }), post('b.md')])
    assert.match(error, /blog\/a\.md has the alias \/b, which is where blog\/b\.md is served/)
})
