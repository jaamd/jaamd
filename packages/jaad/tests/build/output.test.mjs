import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { inferRepo } from '@jaamd/site/infer.ts'
import { page, distFiles, allCss } from '../dist.mjs'

// The fixture infers its repository from this checkout's remote, whatever its forge.
const repo = inferRepo(fileURLToPath(new URL('../fixture', import.meta.url)))

test("jaamd's remark plugins ran", () => {
    const markdown = page('docs/markdown/index.html')
    assert.match(markdown, /markdown-alert/)
    assert.match(markdown, /code-tabs/)
})

test('astro redirects set in the jaad config are emitted', () => {
    assert.match(page('docs/retired/index.html'), /url=\/docs\/markdown["']?/)
})

test('fonts set in astro.fonts are loaded on every page', () => {
    for (const name of ['docs/index.html', 'docs/markdown/index.html']) {
        assert.match(page(name), /@font-face\{[^}]*font-family:"?Fixture Mono/, name)
    }
})

test('dual-theme code colours reach the built CSS', () => {
    const css = allCss()
    assert.ok(
        css.includes('var(--shiki-light)') && css.includes('var(--shiki-dark)'),
        'shiki-dual.css did not ship; code blocks would render uncoloured',
    )
})

test('no page title names the framework instead of the site', () => {
    const offenders = distFiles('.html')
        .map((f) => {
            return [f.split('/dist/')[1], readFileSync(f, 'utf8')]
        })
        .filter(([, html]) => {
            return /<title>[^<]*\bJAAD\b[^<]*\bJAAD\b/.test(html)
        })
        .map(([name]) => {
            return name
        })
    assert.deepEqual(offenders, [])
})

// Fonts are shipped with the package
const HOSTS = ['nerdfonts.com', 'fonts.googleapis.com', 'fonts.gstatic.com']

test('no third-party host on the critical path', () => {
    const offenders = distFiles('.html')
        .flatMap((f) => {
            const html = readFileSync(f, 'utf8')
            return HOSTS.filter((h) => {
                return html.includes(h)
            }).map((h) => {
                return `${f.split('/dist/')[1]}: ${h}`
            })
        })
        .toSorted()
    assert.deepEqual(offenders, [])
})

test('the fonts are served from the site itself', () => {
    const faces = page('docs/index.html').match(/@font-face\{[^}]*\}/g) ?? []
    const withFile = faces.filter((f) => {
        return f.includes('url(')
    })
    assert.ok(withFile.length > 0, 'no font-face carries a file')
    for (const face of withFile) {
        assert.match(face, /url\("?\/[^")]*\.woff2/, 'font is not self-hosted')
    }
})

const noRemote = repo ? false : 'no git remote to infer a repository from'

test('the inferred repository is a single icon, with no menu to repeat it', { skip: noRemote }, () => {
    const home = page('docs/index.html')
    const links = home.split(`href="${repo.url}"`).length - 1
    assert.notEqual(links, 0, 'no repository link was rendered at all')
    assert.equal(links, 1, 'the repository link is listed twice')
    assert.doesNotMatch(home, /<jaad-nav-mobile/, 'an empty mobile menu shipped')
})

// The docs config sets no `footer`, so the credit appears on its own.
test('an unset footer renders the credit, not its placeholder', () => {
    const footer = page('docs/index.html').match(/<footer[\s\S]*?<\/footer>/)?.[0]
    assert.ok(footer, 'no footer in the built page')
    assert.match(footer, /docs\.jaamd\.org\/jaad/)
    assert.doesNotMatch(footer, /:credit/, ':credit reached the page unexpanded')
})

test('every docs page carries its search index and llms entry', () => {
    const index = JSON.parse(page('docs/search-index.json'))
    assert.ok(index.pages.length > 0, 'search index is empty')
    assert.match(page('docs/llms.txt'), /^# /)
})

test('the search index is versioned, and names the Markdown of every page', () => {
    const index = JSON.parse(page('docs/search-index.json'))
    assert.equal(index.version, 1)
    for (const entry of index.pages) {
        assert.match(entry.markdown, /\.md$/, entry.title)
    }
})

test('the Markdown of a page reads on its own: a title, no directives, no links to files', () => {
    const markdown = page('docs/markdown.md')
    assert.match(markdown, /^# Markdown\n/)
    assert.doesNotMatch(markdown, /^:::/m, 'a directive was left raw')
    assert.doesNotMatch(markdown, /\]\(\.{1,2}\/[^)]*\.md/, 'a link still points at a source file')
    assert.match(markdown, /\*\*npm\*\*\n\n```bash/, 'code tabs did not become labelled blocks')
})

// llms.txt lists loose pages before the chapters; llms-full.txt reads in the site's order.
test('llms-full.txt holds every page of llms.txt', () => {
    const listed = [...page('docs/llms.txt').matchAll(/^- \[[^\]]+\]\(([^)]+)\)/gm)].map((match) => {
        return match[1]
    })
    const sources = [...page('docs/llms-full.txt').matchAll(/^Source: (\S+)$/gm)].map((match) => {
        return match[1]
    })
    assert.ok(listed.length > 0)
    assert.deepEqual(sources.toSorted(), listed.toSorted())
})

test('a docs page announces its Markdown to agents', () => {
    assert.match(
        page('docs/markdown/index.html'),
        /<link rel="alternate" type="text\/markdown" href="\/docs\/markdown\.md">/,
    )
})

test('every heading in the search index is an id on its page', () => {
    const index = JSON.parse(page('docs/search-index.json'))
    const missing = index.entries
        .filter((entry) => {
            return entry.anchor
        })
        .map((entry) => {
            return `${index.pages[entry.page].href.slice(1)}/index.html#${entry.anchor}`
        })
        .filter((target) => {
            const [file, anchor] = target.split('#')
            return !page(file).includes(`id="${anchor}"`)
        })
    assert.ok(
        index.entries.some((entry) => {
            return entry.anchor
        }),
        'no heading reached the index',
    )
    assert.deepEqual(missing, [])
})

test('the sidebar follows the numeric prefixes', () => {
    const links = [...page('docs/index.html').matchAll(/<a\b[^>]*\bhref="(\/docs(?:\/[^"#]*)?)"/g)].map((m) => {
        return m[1]
    })

    const at = (href) => {
        const index = links.indexOf(href)
        assert.notEqual(index, -1, `${href} is missing from the sidebar`)
        return index
    }

    // Astro's defaults build every page as a directory, so page urls end with a slash.
    assert.equal(links[0], '/docs/', 'the opening page should own routeBase')
    assert.ok(
        at('/docs/getting-started/installation/') < at('/docs/markdown/'),
        'getting started must come before markdown',
    )
    assert.ok(
        at('/docs/getting-started/installation/') < at('/docs/getting-started/deployment/'),
        'files inside a chapter must follow their own numbers',
    )
})
