import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { page, distFiles, allCss } from '../dist.mjs'

test("jaamd's remark plugins ran", () => {
    const markdown = page('docs/markdown/index.html')
    assert.match(markdown, /markdown-alert/)
    assert.match(markdown, /code-tabs/)
})

test('astro redirects set in the jaad config are emitted', () => {
    assert.match(page('docs/retired/index.html'), /url=\/docs\/markdown["']?/)
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
        .map((f) => [f.split('/dist/')[1], readFileSync(f, 'utf8')])
        .filter(([, html]) => /<title>[^<]*\bJAAD\b[^<]*\bJAAD\b/.test(html))
        .map(([name]) => name)
    assert.deepEqual(offenders, [])
})

// Fonts are shipped with the package
const HOSTS = ['nerdfonts.com', 'fonts.googleapis.com', 'fonts.gstatic.com']

test('no third-party host on the critical path', () => {
    const offenders = distFiles('.html')
        .flatMap((f) => {
            const html = readFileSync(f, 'utf8')
            return HOSTS.filter((h) => html.includes(h)).map((h) => `${f.split('/dist/')[1]}: ${h}`)
        })
        .toSorted()
    assert.deepEqual(offenders, [])
})

test('the fonts are served from the site itself', () => {
    const faces = page('docs/index.html').match(/@font-face\{[^}]*\}/g) ?? []
    const withFile = faces.filter((f) => f.includes('url('))
    assert.ok(withFile.length > 0, 'no font-face carries a file')
    for (const face of withFile) {
        assert.match(face, /url\("?\/[^")]*\.woff2/, 'font is not self-hosted')
    }
})

test('the inferred repository is a single icon, with no menu to repeat it', () => {
    const home = page('docs/index.html')
    const match = home.match(/href="(https:\/\/github\.com\/[\w-]+\/[\w-]+)"/)
    assert.ok(match, 'no repository link was rendered at all')
    const repo = match[1]

    assert.equal(home.split(`href="${repo}"`).length - 1, 1, 'the repository link is listed twice')
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

test('every heading in the search index is an id on its page', () => {
    const index = JSON.parse(page('docs/search-index.json'))
    const missing = index.entries
        .filter((entry) => entry.anchor)
        .map((entry) => `${index.pages[entry.page].href.slice(1)}/index.html#${entry.anchor}`)
        .filter((target) => {
            const [file, anchor] = target.split('#')
            return !page(file).includes(`id="${anchor}"`)
        })
    assert.ok(
        index.entries.some((entry) => entry.anchor),
        'no heading reached the index',
    )
    assert.deepEqual(missing, [])
})

test('the sidebar follows the numeric prefixes', () => {
    const links = [...page('docs/index.html').matchAll(/href="(\/docs(?:\/[^"#]*)?)"/g)].map((m) => m[1])

    const at = (href) => {
        const index = links.indexOf(href)
        assert.notEqual(index, -1, `${href} is missing from the sidebar`)
        return index
    }

    assert.equal(links[0], '/docs', 'the opening page should own routeBase')
    assert.ok(
        at('/docs/getting-started/installation') < at('/docs/markdown'),
        'getting started must come before markdown',
    )
    assert.ok(
        at('/docs/getting-started/installation') < at('/docs/getting-started/deployment'),
        'files inside a chapter must follow their own numbers',
    )
})

test('a fixed shell: header and sidebars hold still, only the page scrolls', () => {
    const css = allCss().replace(/\s+/g, '')

    assert.match(
        css,
        /--jaad-chrome-width:calc\(var\(--jaad-content-width\)\+2\*var\(--jaad-sidebar-width\)/,
        'the chrome width is no longer derived from the content and sidebar widths',
    )
    assert.match(css, /\.jaad-header\{[^}]*position:fixed/, 'the header scrolls with the page')
    assert.match(css, /\.jaad-header-inner\{[^}]*max-width:var\(--jaad-chrome-width\)/)
    assert.match(css, /\.jaad-body\{[^}]*padding-top:var\(--jaad-header-height\)/, 'the page starts under the header')
    assert.match(css, /\.docs-container\{[^}]*max-width:var\(--jaad-chrome-width\)/)
    assert.match(css, /\.docs-main\{[^}]*max-width:var\(--jaad-content-width\)/)
    assert.ok(!css.includes('max-width:50rem'), 'a hardcoded chrome width is back')

    assert.match(
        css,
        /grid-template-columns:var\(--jaad-sidebar-width\)minmax\(0,1fr\)var\(--jaad-sidebar-width\)/,
        'the sidebar columns no longer follow the sidebar token',
    )
    assert.match(
        css,
        /\[data-jaad-default-frame\]\.docs-sidebar-right\{[^}]*position:fixed/,
        'the sidebars move with the page',
    )
    assert.match(
        css,
        /\.docs-sidebar-left\{[^}]*left:max\(1rem,calc\(50%-var\(--jaad-chrome-width\)\/2\+1rem\)\)/,
        'the sidebars are no longer placed at the edges of the header column',
    )
    assert.match(css, /\.docs-container>\.jaad-footer\{grid-column:2\}/, 'the footer no longer closes the page column')

    const html = page('docs/getting-started/installation/index.html')
    assert.match(html, /<header[^>]*class="jaad-header"/)
    assert.match(html, /data-jaad-default-frame/)
    assert.ok(html.indexOf('class="docs-main"') < html.indexOf('<footer'), 'the footer comes before the page')
})

test('docs and the page layout share one padding token', () => {
    const css = allCss().replace(/\s+/g, '')

    for (const rule of ['.jaad-main', '.docs-page-main']) {
        assert.match(
            css,
            new RegExp(`\\${rule}\\{[^}]*padding-inline:var\\(--jaad-page-padding\\)`),
            `${rule} does not read the padding token`,
        )
    }

    // The page nav takes its width from the main it sits in, not its own number.
    const nav = page('docs/getting-started/installation/index.html')
        .match(/<nav[^>]*>/g)
        ?.find((tag) => tag.includes('aria-label="Page navigation"'))

    assert.ok(nav, 'the page navigation is missing from the built page')
    assert.doesNotMatch(nav, /max-w-/, 'the page nav pins itself to an absolute width again')
})
