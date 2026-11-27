import assert from 'node:assert/strict'
import { test } from 'node:test'
import { absoluteAuthorUrl, assertDefaultAuthor, authorHref, pageAuthors, resolveAuthors } from '../../src/authors.ts'

const PEOPLE = {
    ada: { name: 'Ada Lovelace', url: 'https://ada.example' },
    grace: { name: 'Grace Hopper' },
}

test('a key is its person, any other string a name, an object as written', () => {
    assert.deepEqual(resolveAuthors(['ada', 'Mary Somerville', { name: 'Charles', url: '/charles/' }], PEOPLE), [
        { name: 'Ada Lovelace', url: 'https://ada.example' },
        { name: 'Mary Somerville', url: null },
        { name: 'Charles', url: '/charles/' },
    ])
    assert.deepEqual(resolveAuthors('grace', PEOPLE), [{ name: 'Grace Hopper', url: null }])
    assert.deepEqual(resolveAuthors(undefined, PEOPLE), [])
})

test("a page's authors, else its older author, else the default", () => {
    assert.deepEqual(pageAuthors({ authors: ['ada'], author: 'Mary' }, PEOPLE, 'grace'), [
        { name: 'Ada Lovelace', url: 'https://ada.example' },
    ])
    assert.deepEqual(pageAuthors({ author: 'ada' }, PEOPLE, 'grace'), [
        { name: 'Ada Lovelace', url: 'https://ada.example' },
    ])
    assert.deepEqual(pageAuthors({}, PEOPLE, 'grace'), [{ name: 'Grace Hopper', url: null }])
    assert.deepEqual(pageAuthors({}, PEOPLE, null), [])
})

test('an empty list names nobody, even with a default', () => {
    assert.deepEqual(pageAuthors({ authors: [] }, PEOPLE, 'grace'), [])
})

test('the default author has to be one of the people', () => {
    assertDefaultAuthor('jaad', 'ada', PEOPLE)
    assertDefaultAuthor('jaad', undefined, PEOPLE)
    assert.throws(() => {
        assertDefaultAuthor('jaad', 'ghost', PEOPLE)
    }, /jaad: author is "ghost", which authors does not list\n {2}Add it to authors/)
})

test("a root-relative url follows the deployment base; metadata's is absolute", () => {
    const charles = { name: 'Charles', url: '/charles/' }
    const site = new URL('https://example.dev')
    assert.equal(authorHref(charles, '/repo/'), '/repo/charles/')
    assert.equal(absoluteAuthorUrl(charles, '/repo/', site), 'https://example.dev/repo/charles/')
    assert.equal(absoluteAuthorUrl(charles, '/', undefined), null)
    assert.equal(
        absoluteAuthorUrl({ name: 'Ada', url: 'https://ada.example' }, '/repo/', undefined),
        'https://ada.example',
    )
    assert.equal(authorHref({ name: 'Grace', url: null }, '/'), null)
})
