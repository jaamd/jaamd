import assert from 'node:assert/strict'
import { test } from 'node:test'
import { siteOptionsOf } from '@jaamd/site/config.ts'
import { parseConfig, resolveConfig } from '../../src/config.ts'

test('a misspelt option is named, with the one meant', () => {
    assert.throws(() => {
        return parseConfig({ title: 'Blog', perpage: 5 } as never)
    }, /jaab: unknown option perpage \(did you mean perPage\?\)\n {2}available: title/)
})

test('an invalid option names its key', () => {
    assert.throws(() => {
        return parseConfig({ title: 'Blog', perPage: 0 })
    }, /jaab: invalid configuration\n {2}perPage:/)
})

test('the default author must be in authors', () => {
    assert.throws(() => {
        return parseConfig({ title: 'Blog', author: 'ada' })
    }, /jaab: author is "ada", which authors does not list/)
})

test("the site's options leave the blog's out", () => {
    const site = siteOptionsOf(parseConfig({ title: 'Blog', perPage: 5, routeBase: '/blog' }))
    assert.equal(site.title, 'Blog')
    assert.equal('perPage' in site, false)
    assert.equal('routeBase' in site, false)
})

test('the feed carries the last 20 posts, unless told how many or none', () => {
    const feedOf = (feed?: boolean | { limit: number }) => {
        return resolveConfig({ title: 'Blog', ...(feed === undefined ? {} : { feed }) }).blog.feed
    }
    assert.deepEqual(feedOf(), { limit: 20 })
    assert.deepEqual(feedOf({ limit: 5 }), { limit: 5 })
    assert.equal(feedOf(false), null)
})
