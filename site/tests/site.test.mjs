import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { allCss, brokenLinks, readBuilt } from '../../tests/dist.mjs'

const DIST = fileURLToPath(new URL('../dist', import.meta.url))
const page = (relative) => {
    return readBuilt(DIST, relative)
}

const home = () => {
    return page('index.html')
}

test('the home page opens on the wordmark and the tagline', () => {
    assert.match(home(), /<title>JAAMD<\/title>/)
    assert.match(home(), /class="hero-wordmark">JAAMD</)
    assert.match(home(), /Markdown, refined\./)
})

test('the preview is rendered at build by JAAMD, so it shows without scripts', () => {
    const preview = home().match(/<article id="preview"[\s\S]*?<\/article>/)?.[0] ?? ''
    assert.match(preview, /class="jaamd-content landing-preview"/)
    assert.match(preview, /markdown-alert markdown-alert-tip/)
    assert.match(preview, /class="jaamd-code-tabs"/)
    assert.match(preview, /class="jaamd-table-wrapper"/)
    assert.match(preview, /class="jaamd-spoiler"/)
    assert.match(preview, /<h2 id="install">Install<a class="jaamd-heading-link" href="#install"/)
})

test('every JAAMD theme can dress the preview, and only the preview', () => {
    const css = allCss(DIST)
    const options = [...home().matchAll(/<option value="([^"]+)"/g)].map((m) => {
        return m[1]
    })
    assert.equal(options[0], 'default')
    for (const slug of options.slice(1)) {
        assert.match(css, new RegExp(`\\.landing-preview\\[data-jaamd-theme='${slug}'\\]`), slug)
    }
    assert.doesNotMatch(css, /(^|[^-\w])html\.dark\s*\{[^}]*--jaamd-/m, 'a JAAMD rule left on the whole page')
})

test('the related projects link to the documentation', () => {
    const related = home().match(/<section class="related"[\s\S]*?<\/section>/)?.[0] ?? ''
    for (const name of ['@jaamd/astro', 'JAAD', 'JAAB', '@jaamd/react']) {
        assert.match(related, new RegExp(`>${name}<`))
    }
    assert.match(related, /href="https:\/\/docs\.jaamd\.org\/jaamd"/)
    assert.match(related, /href="https:\/\/docs\.jaamd\.org\/jaad"/)
})

test('the documentation is no longer built here', () => {
    assert.equal(existsSync(join(DIST, 'docs')), false)
    assert.equal(existsSync(join(DIST, 'jaad')), false)
    assert.match(page('llms.txt'), /https:\/\/docs\.jaamd\.org\/llms\.txt/)
})

test('a wrong url gets the site page, which names no url of its own', () => {
    const notFound = page('404.html')
    assert.match(notFound, /<title>404 \| JAAMD<\/title>/)
    assert.doesNotMatch(notFound, /rel="canonical"|property="og:url"/)
    assert.match(notFound, /<meta name="robots" content="noindex">/)
    assert.match(home(), /<link rel="canonical" href="https:\/\/jaamd\.org\/">/)
})

test('robots.txt names no sitemap the build does not write', () => {
    for (const [, url] of page('robots.txt').matchAll(/^Sitemap:\s*(\S+)/gm)) {
        assert.ok(existsSync(join(DIST, new URL(url).pathname)), url)
    }
})

test('every internal link points at a built page', () => {
    assert.deepEqual(brokenLinks(DIST), [])
})
