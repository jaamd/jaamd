import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { DIST, allCss, page, walk } from './dist.mjs'

test('the home page is the jaamd showcase, rendered with jaamd', () => {
    const home = page('index.html')
    assert.match(home, /<title>JAAMD<\/title>/)
    assert.match(home, /class="[^"]*jaamd-content/)
    assert.match(home, /markdown-alert/)
    assert.match(home, /data-jaamd-theme/)
})

test('the jaamd documentation is the package README', () => {
    const docs = page('docs/jaamd/index.html')
    assert.match(docs, /<title>Documentation \| JAAMD<\/title>/)
    assert.match(docs, /class="[^"]*jaamd-content/)
    assert.match(docs, /@jaamd\/jaamd/)
    assert.match(docs, /id="installation"/)
})

test('the jaad documentation is mounted below /docs/jaad', () => {
    assert.match(page('docs/jaad/index.html'), /data-jaad-default-frame/)
    assert.match(page('docs/jaad/getting-started/installation/index.html'), /<title>Installation \| JAAMD<\/title>/)
    assert.match(page('docs/jaad/llms.txt'), /^# /)
})

test('/docs opens the jaamd documentation', () => {
    assert.match(page('docs/index.html'), /url=\/docs\/jaamd["']?/)
})

test('llms.txt serves the jaamd README', () => {
    assert.match(page('llms.txt'), /^# jaamd\n/)
})

// With routeBase set, JAAD injects no 404: the site has to bring its own.
test('the site answers a wrong url with its own page', () => {
    const missing = page('404.html')
    assert.match(missing, /<title>404 \| JAAMD<\/title>/)
    assert.match(missing, /<body[^>]*data-site-layout/)
    assert.match(missing, /href="\/docs"/, 'no way back into the documentation')
})

test('the jaad landing page shares the docs measure without using its frame', () => {
    const landing = page('jaad/index.html')
    const css = allCss().replace(/\s+/g, '')

    assert.match(landing, /<body[^>]*data-site-layout/)
    assert.doesNotMatch(landing, /jaad-chrome|data-jaad-default-frame/)
    assert.match(css, /\.site-chrome\{[^}]*max-width:var\(--site-content-width\)/)
    assert.match(css, /\.site-main\{[^}]*max-width:var\(--site-content-width\)/)
    assert.match(landing, /<site-theme-toggle>/)
})

const resolves = (path) =>
    [join(DIST, path), join(DIST, path, 'index.html'), join(DIST, `${path}.html`)].some(
        (file) => existsSync(file) && !file.endsWith('/'),
    )

test('every internal link points at a built page', () => {
    const broken = walk()
        .filter((file) => file.endsWith('.html'))
        .flatMap((file) => {
            const html = readFileSync(file, 'utf8')
            return [...html.matchAll(/href="(\/(?!\/)[^"#?]*)/g)]
                .map((m) => decodeURI(m[1]))
                .filter((href) => !resolves(href))
                .map((href) => `${file.slice(DIST.length)} → ${href}`)
        })
    assert.deepEqual([...new Set(broken)], [])
})
