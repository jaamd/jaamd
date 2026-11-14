import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { DIST, allCss, page, walk } from './dist.mjs'

const home = () => page('index.html')

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
    const css = allCss()
    const options = [...home().matchAll(/<option value="([^"]+)"/g)].map((m) => m[1])
    assert.equal(options[0], 'default')
    for (const slug of options.slice(1)) {
        assert.match(css, new RegExp(`\\.landing-preview\\[data-jaamd-theme='${slug}'\\]`), slug)
    }
    assert.doesNotMatch(css, /(^|[^-\w])html\.dark\s*\{[^}]*--jaamd-/m, 'a JAAMD rule left on the whole page')
})

test('the related projects link to the documentation', () => {
    const related = home().match(/<section class="related"[\s\S]*?<\/section>/)?.[0] ?? ''
    for (const name of ['@jaamd/astro', 'JAAD', 'JAAB', '@jaamd/react']) assert.match(related, new RegExp(`>${name}<`))
    assert.match(related, /href="https:\/\/docs\.jaamd\.org\/jaamd"/)
    assert.match(related, /href="https:\/\/docs\.jaamd\.org\/jaad"/)
})

test('the documentation is no longer built here', () => {
    assert.equal(existsSync(join(DIST, 'docs')), false)
    assert.equal(existsSync(join(DIST, 'jaad')), false)
    assert.match(page('llms.txt'), /https:\/\/docs\.jaamd\.org\/llms\.txt/)
})

test('a wrong url gets the site page', () => {
    assert.match(page('404.html'), /<title>404 \| JAAMD<\/title>/)
})

const resolves = (path) =>
    [join(DIST, path), join(DIST, path, 'index.html'), join(DIST, `${path}.html`)].some(
        (file) => existsSync(file) && !file.endsWith('/'),
    )

test('every internal link points at a built page', () => {
    const broken = walk()
        .filter((file) => file.endsWith('.html'))
        .flatMap((file) =>
            [...readFileSync(file, 'utf8').matchAll(/href="(\/(?!\/)[^"#?]*)/g)]
                .map((m) => decodeURI(m[1]))
                .filter((href) => !resolves(href))
                .map((href) => `${file.slice(DIST.length)} → ${href}`),
        )
    assert.deepEqual([...new Set(broken)], [])
})
