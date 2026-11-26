import assert from 'node:assert/strict'
import { test } from 'node:test'
import { docsFileHref, docsMarkdownHref, docsPageHref } from '../../src/docs/urls.ts'

test('the opening doc uses the mount point while markdown keeps its slug', () => {
    assert.equal(docsPageHref('', { docsBase: '', deploymentBase: '/repo' }), '/repo/')
    assert.equal(docsPageHref('', { docsBase: '/docs', deploymentBase: '/repo' }), '/repo/docs')
    assert.equal(
        docsPageHref('guide', {
            docsBase: '/docs',
            deploymentBase: '/repo',
        }),
        '/repo/docs/guide',
    )
    assert.equal(
        docsMarkdownHref('introduction', {
            docsBase: '/docs',
            deploymentBase: '/repo',
        }),
        '/repo/docs/introduction.md',
    )
})

// ── Locale segment ───────────────────────────────────────────────────────────

test('the default locale keeps the urls it had before i18n', () => {
    const urls = { docsBase: '/docs', locale: 'en', defaultLocale: 'en' }
    assert.equal(docsPageHref('guide', urls), '/docs/guide')
    assert.equal(docsPageHref('', urls), '/docs')
    assert.equal(docsMarkdownHref('guide', urls), '/docs/guide.md')
})

test('every other locale prefixes the slug', () => {
    const urls = { docsBase: '/docs', locale: 'it', defaultLocale: 'en' }
    assert.equal(docsPageHref('guida', urls), '/docs/it/guida')
    assert.equal(docsPageHref('', urls), '/docs/it')
    assert.equal(docsMarkdownHref('guida', urls), '/docs/it/guida.md')
})

test('a locale at the site root still resolves the opening page', () => {
    assert.equal(docsPageHref('', { docsBase: '', locale: 'it', defaultLocale: 'en' }), '/it')
    assert.equal(docsPageHref('', { docsBase: '', locale: 'en', defaultLocale: 'en' }), '/')
})

// withDeploymentBase is not idempotent, so the locale goes in before it.
test('the deployment base wraps the locale, and only once', () => {
    assert.equal(
        docsPageHref('guida', {
            docsBase: '/docs',
            deploymentBase: '/repo',
            locale: 'it',
            defaultLocale: 'en',
        }),
        '/repo/docs/it/guida',
    )
})

test('page urls end with a slash when Astro builds them so', () => {
    const urls = { docsBase: '/docs', deploymentBase: '/repo', trailingSlash: true }
    assert.equal(docsPageHref('guide', urls), '/repo/docs/guide/')
    assert.equal(docsPageHref('', urls), '/repo/docs/')
    assert.equal(docsPageHref('', { docsBase: '', trailingSlash: true }), '/')
    assert.equal(
        docsPageHref('guide', { docsBase: '', locale: 'it', defaultLocale: 'en', trailingSlash: true }),
        '/it/guide/',
    )
})

test('files never take the slash of pages', () => {
    const urls = { docsBase: '/docs', trailingSlash: true }
    assert.equal(docsMarkdownHref('guide', urls), '/docs/guide.md')
    assert.equal(docsFileHref('search-index.json', urls), '/docs/search-index.json')
    assert.equal(
        docsFileHref('search-index.json', { docsBase: '', locale: 'it', defaultLocale: 'en' }),
        '/it/search-index.json',
    )
})
