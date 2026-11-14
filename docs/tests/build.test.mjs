import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { MOVED } from '../worker.ts'

const DIST = fileURLToPath(new URL('../dist', import.meta.url))
const PACKAGES = fileURLToPath(new URL('../../packages', import.meta.url))

function walk(dir) {
    if (!existsSync(dir)) throw new Error(`no build at ${dir}: run the build first`)
    return readdirSync(dir).flatMap((entry) => {
        const path = join(dir, entry)
        return statSync(path).isDirectory() ? walk(path) : [path]
    })
}

const page = (relative) => readFileSync(join(DIST, relative), 'utf8')

/** The url of every markdown file of a package: its section, then its clean path. */
const urlsOf = (section, pkg) => {
    const docs = join(PACKAGES, pkg, 'docs')
    return walk(docs).map((file) =>
        [
            section,
            ...file
                .slice(docs.length + 1)
                .replace(/\.md$/, '')
                .split('/')
                .map((part) => part.replace(/^\d+-/, '')),
        ].join('/'),
    )
}

test('the docs open on the welcome page, and each section at its own url', () => {
    const home = page('index.html')
    assert.match(home, /data-jaad-default-frame/)
    assert.match(home, /<h1[^>]*>Welcome to JAAMD/)
    assert.match(page('jaamd/index.html'), /<h1[^>]*>Overview/)
    assert.match(page('welcome/index.html'), /http-equiv="refresh"[^>]*url=\/"/)
    assert.match(home, /<link rel="canonical" href="https:\/\/docs\.jaamd\.org\/?"/)
})

// The old jaamd.org/docs/<path> urls redirect to docs.jaamd.org/<path>.
test('every page of both packages has a url, so every old /docs url has a target', () => {
    const missing = [...urlsOf('jaamd', 'astro'), ...urlsOf('jaad', 'jaad')].filter(
        (url) => !existsSync(join(DIST, url, 'index.html')),
    )
    assert.deepEqual(missing, [])
})

test('every moved page has a built target', () => {
    const missing = Object.values(MOVED).filter((target) => !existsSync(join(DIST, target, 'index.html')))
    assert.deepEqual(missing, [])
})

test('the header holds the site name, leading to jaamd.org, and no text links', () => {
    const header = page('index.html').match(/<header[\s\S]*?<\/header>/)[0]
    assert.match(header, /<a href="https:\/\/jaamd\.org"[^>]*class="jaad-brand-link"/)
    assert.doesNotMatch(header, /jaad-nav-link/)
})

test('the sidebar starts with the welcome page, then both sections with their chapters', () => {
    const home = page('index.html')
    const sidebar = home.slice(home.indexOf('docs-sidebar-left'), home.indexOf('</aside>'))
    assert.match(
        sidebar,
        /href="\/"[^>]*>\s*Welcome[\s\S]*section-title">JAAMD<[\s\S]*Styling[\s\S]*section-title">JAAD<[\s\S]*Getting Started/,
    )
})

test('llms.txt indexes both sections at the root', () => {
    const llms = page('llms.txt')
    assert.match(llms, /## JAAMD[\s\S]*## JAAD/)
    assert.match(llms, /https:\/\/docs\.jaamd\.org\/jaad\/getting-started\/installation\.md/)
})

const resolves = (path) =>
    [join(DIST, path), join(DIST, path, 'index.html'), join(DIST, `${path}.html`)].some(
        (file) => existsSync(file) && !file.endsWith('/'),
    )

test('every internal link points at a built page', () => {
    const broken = walk(DIST)
        .filter((file) => file.endsWith('.html'))
        .flatMap((file) =>
            [...readFileSync(file, 'utf8').matchAll(/href="(\/(?!\/)[^"#?]*)/g)]
                .map((m) => decodeURI(m[1]))
                .filter((href) => !resolves(href))
                .map((href) => `${file.slice(DIST.length)} → ${href}`),
        )
    assert.deepEqual([...new Set(broken)], [])
})

const pageFile = (href) => join(DIST, href, 'index.html')

test('every search anchor and every table-of-contents link is an id of its page', () => {
    const index = JSON.parse(page('search-index.json'))
    const searchTargets = index.entries
        .filter((entry) => entry.anchor)
        .map((entry) => [pageFile(index.pages[entry.page].href), entry.anchor])
    const tocTargets = walk(DIST)
        .filter((file) => file.endsWith('.html'))
        .flatMap((file) =>
            [...readFileSync(file, 'utf8').matchAll(/<a href="#([^"]+)" data-toc-link/g)].map((m) => [file, m[1]]),
        )

    assert.ok(searchTargets.length > 0 && tocTargets.length > 0)
    const missing = [...searchTargets, ...tocTargets]
        .filter(([file, id]) => !readFileSync(file, 'utf8').includes(`id="${id}"`))
        .map(([file, id]) => `${file.slice(DIST.length)}#${id}`)
    assert.deepEqual([...new Set(missing)], [])
})
