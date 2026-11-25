import assert from 'node:assert/strict'
import { after, before, describe, test } from 'node:test'
import { build } from 'astro'
import jaad from '../../index.ts'
import { built, inline, project, removeProjects } from './projects.mjs'

const SITE = 'https://example.dev'

const DOCS = {
    'docs/01-getting-started.md': [
        '---',
        'slug: this-frontmatter-field-must-not-own-the-url',
        'title: Frontmatter Wins',
        'keywords: [alpha, beta]',
        '---',
        '',
        '# Getting Started',
        '',
        'A first page with a **bold** word.',
        '',
        '## A section',
        '',
        'Text.',
        '',
    ].join('\n'),
    'docs/02-guides/01-deep-dive.md': [
        '---',
        'title: A Deep Dive Into Everything',
        'label: Deep Dive',
        'order: 1',
        'author: Ada Lovelace',
        'ogImage: /logo.svg',
        'lastUpdated: 2026-09-12',
        '---',
        '',
        '# Deep Dive',
        '',
        'Second page.',
        '',
    ].join('\n'),
    'docs/03-draft.md': '---\ndraft: true\n---\n\n# Draft\n\nThis page is only served in development.\n',
    'public/logo.svg': '<svg xmlns="http://www.w3.org/2000/svg"/>\n',
}

after(removeProjects)

describe('docs at the root, with frontmatter, a draft and a header', () => {
    let site

    before(async () => {
        const root = project(DOCS)
        await build(
            inline(
                root,
                [
                    jaad({
                        site: SITE,
                        title: 'Build Test',
                        logo: '/logo.svg',
                        nav: [{ label: 'API', href: 'https://api.example.dev' }],
                        social: { github: 'https://github.com/example/consumer' },
                    }),
                ],
                { site: SITE },
            ),
        )
        site = built(root)
    })

    test('every documentation page is built, nesting included', () => {
        assert.ok(site.pages.includes('/index.html'), 'no docs index')
        assert.ok(site.pages.includes('/getting-started/index.html'))
        assert.ok(site.pages.includes('/guides/deep-dive/index.html'), 'nested chapter page missing')

        assert.match(
            site.read('getting-started/index.html'),
            /http-equiv="refresh"[^>]+url=\//,
            "the opening page's named slug is not a redirect",
        )

        const index = JSON.parse(site.read('search-index.json'))
        assert.equal(index.pages.length, 2, 'the search index missed a page')
        assert.equal(index.pages[0].href, '/', 'search does not point at the docs root')
    })

    test('frontmatter renames, reorders and describes a page', () => {
        const deepDive = site.read('guides/deep-dive/index.html')

        assert.match(deepDive, /<title>A Deep Dive Into Everything \| /)
        assert.match(
            deepDive,
            /<a[^>]+href="\/guides\/deep-dive\/"[^>]*>[\s\S]{0,200}?Deep Dive</,
            'the sidebar does not use the short label',
        )

        assert.match(deepDive, /<meta name="author" content="Ada Lovelace"/)
        assert.match(deepDive, /<meta property="article:modified_time" content="2026-09-12T/)
        assert.match(
            deepDive,
            /<meta property="og:image" content="https:\/\/example\.dev\/logo\.svg"/,
            "a page-level ogImage did not override the site's",
        )
        assert.match(deepDive, /"author":\{"@type":"Person","name":"Ada Lovelace"\}/)

        const home = site.read('index.html')
        assert.match(home, /<meta name="keywords" content="alpha, beta"/)
        assert.match(home, /"keywords":\["alpha","beta"\]/)
        assert.deepEqual(JSON.parse(site.read('search-index.json')).pages[0].keywords, ['alpha', 'beta'])
    })

    test('a draft is left out of the production build entirely', () => {
        assert.ok(
            !site.pages.some((file) => {
                return file.includes('draft')
            }),
            'a draft page was routed',
        )

        const index = JSON.parse(site.read('search-index.json'))
        assert.ok(
            !index.pages.some((page) => {
                return page.href.includes('draft')
            }),
            'a draft page reached the search index',
        )
        assert.doesNotMatch(site.read('llms.txt'), /\/draft/)
    })

    // A date in frontmatter that nothing renders is a field nobody would set.
    test("a lastUpdated date is shown, formatted for the page's language", () => {
        const page = site.read('guides/deep-dive/index.html')
        assert.match(page, /<time datetime="2026-09-12T00:00:00\.000Z">/)
        assert.match(page, />Last updated on <time/)
        assert.match(page, /September 12, 2026|12 September 2026/)
    })

    test('a single-locale site renders no switcher at all', () => {
        assert.doesNotMatch(site.read('index.html'), /<jaad-locale-switcher/)
    })

    test('the repository is listed once, and the mobile menu does not repeat it', () => {
        const home = site.read('index.html')
        const found = home.match(/<jaad-nav-mobile[\s\S]*?<\/jaad-nav-mobile>/)
        assert.ok(found, 'the mobile menu was not rendered at all')
        const menu = found[0]

        assert.match(menu, />API</, 'the mobile menu lost the nav links')
        assert.doesNotMatch(menu, /github\.com/, 'the mobile menu repeats an icon')
        assert.equal(
            (home.match(/href="https:\/\/github\.com\/example\/consumer"/g) ?? []).length,
            1,
            'the repository link is not listed exactly once',
        )
        assert.match(home, /aria-label="GitHub"/, 'no forge label on the icon')
    })

    test('the theme switcher and its script ship by default', () => {
        const home = site.read('index.html')
        assert.match(home, /<jaad-theme-toggle>/, 'no theme switcher by default')
        assert.match(home, /prefers-color-scheme/, 'no theme script by default')
    })
})

describe('docs below a landing page, at a deployment base, with a pinned appearance', () => {
    let site

    before(async () => {
        const root = project({
            ...DOCS,
            'src/pages/page.astro': [
                '---',
                "import PageLayout from '@jaamd/jaad/layouts/Page.astro'",
                '---',
                '',
                '<PageLayout title="Changelog" bare>',
                '    <section data-page-layout>Outside the documentation.</section>',
                '</PageLayout>',
                '',
            ].join('\n'),
        })
        await build(
            inline(
                root,
                [
                    jaad({
                        site: SITE,
                        base: '/repo',
                        title: 'Build Test',
                        routeBase: '/docs',
                        logo: '/logo.svg',
                        appearance: 'dark',
                        theme: 'dracula',
                    }),
                ],
                { site: SITE, base: '/repo' },
            ),
        )
        site = built(root)
    })

    test('an empty nav renders no mobile menu at all', () => {
        assert.doesNotMatch(
            site.read('docs/index.html'),
            /<jaad-nav-mobile/,
            'the mobile menu is rendered with nothing to put in it',
        )
    })

    // A preset's palette reaches JAAD's tokens only through the reverse bridge.
    // Without it a page renders the default palette while the docs render dracula.
    test('a preset palette reaches pages of your own, not just the docs', () => {
        const bridge = /--color-background:\s*var\(--jaamd-bg\)/
        assert.match(site.cssOf('docs/index.html'), bridge, 'the docs lost the preset bridge')
        assert.match(
            site.cssOf('page/index.html'),
            bridge,
            'a page built on the exported Page.astro has no preset palette',
        )
    })

    test("routeBase nests the docs and every link follows Astro's base", () => {
        assert.ok(site.pages.includes('/docs/getting-started/index.html'), 'pages not remounted')
        assert.ok(site.pages.includes('/docs/guides/deep-dive/index.html'))
        assert.ok(site.pages.includes('/docs/index.html'), 'no index at the nested docs root')
        assert.ok(!site.pages.includes('/404.html'), "JAAD still owns the site's global 404 when docs are nested")
        assert.match(site.read('docs/index.html'), /docs-sidebar-left/, 'the nested page is not the docs index')

        const page = site.read('docs/guides/deep-dive/index.html')
        assert.match(page, /href="\/repo\/docs\/"/, 'the opening-page link missed the deployment base')
        assert.match(page, /src="\/repo\/logo\.svg"/, 'a public asset missed the deployment base')
        assert.match(
            page,
            /data-index-url="\/repo\/docs\/search-index\.json"/,
            'the search index escaped the documentation mount',
        )
        assert.match(
            page,
            /data-md-href="\/repo\/docs\/guides\/deep-dive\.md"/,
            'the raw markdown action missed the deployment base',
        )
        assert.match(
            site.read('docs/llms.txt'),
            /https:\/\/example\.dev\/repo\/docs\/getting-started\.md/,
            'llms.txt missed the deployment base',
        )
        assert.doesNotMatch(site.files.join('\n'), /^\/search-index\.json$/m)
        // The convention looks for llms.txt at the root: the site writes one there.
        assert.match(
            site.read('llms.txt'),
            /## Docs\n\n[^]*https:\/\/example\.dev\/repo\/docs\/getting-started\.md/,
            'the root llms.txt missed the docs or the deployment base',
        )
        assert.ok(site.files.includes('/docs/search-index.json'))
        assert.equal(
            JSON.parse(site.read('docs/search-index.json')).pages[1].href,
            '/repo/docs/guides/deep-dive/',
            'search missed the docs and deployment bases',
        )
        assert.match(
            site.read('docs/getting-started/index.html'),
            /url=\/repo\/docs/,
            'the opening-page redirect missed the deployment base',
        )
    })

    test('a pinned appearance drops the switcher and the script', () => {
        for (const name of ['docs/index.html', 'docs/guides/deep-dive/index.html']) {
            const html = site.read(name)
            assert.match(html, /<html lang="en" class="dark"/, `${name} does not carry the pinned appearance`)
            assert.doesNotMatch(html, /jaad-theme-toggle/, `${name} still renders the switcher for a pinned appearance`)
            assert.doesNotMatch(
                html,
                /prefers-color-scheme/,
                `${name} still ships the theme script for a pinned appearance`,
            )
        }
    })
})
