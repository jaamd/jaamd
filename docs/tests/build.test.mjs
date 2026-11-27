import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { brokenLinks, readBuilt, walk } from '../../tests/dist.mjs'
import { MARKDOWN_SOURCES, MOVED } from '../worker.ts'

const DIST = fileURLToPath(new URL('../dist', import.meta.url))
const PACKAGES = fileURLToPath(new URL('../../packages', import.meta.url))

const page = (relative) => {
    return readBuilt(DIST, relative)
}

/** The url of every markdown file of a package: its section, then its clean path. */
const urlsOf = (section, pkg) => {
    const docs = join(PACKAGES, pkg, 'docs')
    return walk(docs).map((file) => {
        return [
            section,
            ...file
                .slice(docs.length + 1)
                .replace(/\.md$/, '')
                .split('/')
                .map((part) => {
                    // Astro lowercases a slug: `06-homeLink.md` is `homelink`.
                    return part.replace(/^\d+-/, '').toLowerCase()
                }),
        ].join('/')
    })
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
test('every page of every package has a url, so every old /docs url has a target', () => {
    const urls = [...urlsOf('jaamd', 'astro'), ...urlsOf('jaad', 'jaad'), ...urlsOf('jaab', 'jaab')]
    const missing = urls.filter((url) => {
        return !existsSync(join(DIST, url, 'index.html'))
    })
    assert.deepEqual(missing, [])
})

test('a page title names its section, the opening page the site alone', () => {
    const title = (relative) => {
        return page(relative).match(/<title>([^<]*)<\/title>/)[1]
    }
    assert.equal(title('index.html'), 'JAAMD Docs')
    assert.equal(title('jaamd/index.html'), 'Overview · JAAMD | JAAMD Docs')
    assert.equal(title('jaad/getting-started/installation/index.html'), 'Installation · JAAD | JAAMD Docs')
})

test('the Markdown of every opening page is built where the Worker looks for it', () => {
    const missing = Object.values(MARKDOWN_SOURCES).filter((source) => {
        return !existsSync(join(DIST, source))
    })
    assert.deepEqual(missing, [])
})

test('every moved page has a built target', () => {
    const missing = Object.values(MOVED).filter((target) => {
        return !existsSync(join(DIST, target, 'index.html'))
    })
    assert.deepEqual(missing, [])
})

test('the header holds the J mark, leading to jaamd.org, and no text links', () => {
    const header = page('index.html').match(/<header[\s\S]*?<\/header>/)[0]
    assert.match(
        header,
        /<a href="https:\/\/jaamd\.org"[^>]*class="site-brand-link jaad-brand-link">\s*<img src="\/mark\.svg"/,
    )
    assert.doesNotMatch(header, /site-nav-link/)
})

test('the sidebar starts with the welcome page, then every section with its chapters', () => {
    const home = page('index.html')
    const sidebar = home.slice(home.indexOf('docs-sidebar-left'), home.indexOf('</aside>'))
    assert.match(
        sidebar,
        /href="\/"[^>]*>\s*Welcome[\s\S]*section-title">JAAMD<[\s\S]*Styling[\s\S]*section-title">JAAD<[\s\S]*Getting Started[\s\S]*section-title">JAAB</,
    )
})

test('llms.txt indexes every section at the root', () => {
    const llms = page('llms.txt')
    assert.match(llms, /## JAAMD[\s\S]*## JAAD[\s\S]*## JAAB/)
    assert.match(llms, /https:\/\/docs\.jaamd\.org\/jaad\/getting-started\/installation\.md/)
})

test('every internal link points at a built page', () => {
    assert.deepEqual(brokenLinks(DIST), [])
})

const pageFile = (href) => {
    return join(DIST, href, 'index.html')
}

test('every search anchor and every table-of-contents link is an id of its page', () => {
    const index = JSON.parse(page('search-index.json'))
    const searchTargets = index.entries
        .filter((entry) => {
            return entry.anchor
        })
        .map((entry) => {
            return [pageFile(index.pages[entry.page].href), entry.anchor]
        })
    const tocTargets = walk(DIST)
        .filter((file) => {
            return file.endsWith('.html')
        })
        .flatMap((file) => {
            return [...readFileSync(file, 'utf8').matchAll(/<a href="#([^"]+)" data-toc-link/g)].map((m) => {
                return [file, m[1]]
            })
        })

    assert.ok(searchTargets.length > 0 && tocTargets.length > 0)
    const missing = [...searchTargets, ...tocTargets]
        .filter(([file, id]) => {
            return !readFileSync(file, 'utf8').includes(`id="${id}"`)
        })
        .map(([file, id]) => {
            return `${file.slice(DIST.length)}#${id}`
        })
    assert.deepEqual([...new Set(missing)], [])
})
