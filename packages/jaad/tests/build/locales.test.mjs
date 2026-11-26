import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { after, before, describe, test } from 'node:test'
import { build } from 'astro'
import jaad from '../../index.ts'
import { built, inline, project, removeProjects } from './projects.mjs'

const SITE = 'https://example.dev'

after(removeProjects)

// The same pages in two languages, paired by slug or by translationKey, and a
// language directory with nothing in it.
describe('locale directories under docs', () => {
    let site

    before(async () => {
        const root = project({
            'docs/en/01-getting-started.md': '---\ntitle: Getting Started\n---\n\n# Getting Started\n\nEnglish.\n',
            'docs/en/02-guides/01-deep-dive.md': '# Deep Dive\n\nTranslated.\n',
            'docs/en/02-guides/02-only-in-english.md': '# Only In English\n\nNo Italian counterpart.\n',
            'docs/en/03-handbook/01-setup.md': '---\ntranslationKey: setup\n---\n\n# Setup\n\nPaired by key.\n',
            'docs/it/01-per-iniziare.md': '---\ntitle: Per iniziare\n---\n\n# Per iniziare\n\nItaliano.\n',
            'docs/it/02-guides/01-deep-dive.md': '# Analisi\n\nPaired by slug.\n',
            'docs/it/02-guides/02-solo-italiano.md': '# Solo italiano\n\nNo English counterpart.\n',
            'docs/it/03-guida/01-installazione.md':
                '---\ntranslationKey: setup\n---\n\n# Installazione\n\nPaired by key.\n',
        })
        // Created but never written: it must not reach the switcher or the routes.
        mkdirSync(join(root, 'docs/fr'))

        await build(
            inline(
                root,
                [jaad({ site: SITE, title: 'Build Test', lang: 'en', ui: { it: { 'page.copy': 'Copia' } } })],
                {
                    site: SITE,
                },
            ),
        )
        site = built(root)
    })

    test('locale directories build one documentation site per language', () => {
        // The default locale keeps the urls it had before the second language.
        assert.ok(site.pages.includes('/index.html'), 'no default index')
        assert.ok(site.pages.includes('/guides/deep-dive/index.html'), 'the default locale lost its chaptered page')
        // Three directory levels, which were a structure error before i18n.
        assert.ok(site.pages.includes('/it/index.html'), 'no /it index')

        assert.ok(
            !site.pages.includes('/it/guides/only-in-english/index.html'),
            'an untranslated page was built anyway',
        )

        assert.ok(
            !site.files.some((file) => {
                return file.startsWith('/fr')
            }),
            'an empty locale directory was built anyway',
        )

        const italian = JSON.parse(site.read('it/search-index.json'))
        assert.deepEqual(
            italian.pages.map((page) => {
                return page.href
            }),
            ['/it/', '/it/guides/deep-dive/', '/it/guides/solo-italiano/', '/it/guida/installazione/'],
            'the italian index is not scoped to italian',
        )
        assert.match(site.read('it/llms.txt'), /\/it\//)
        assert.match(site.read('it/llms-full.txt'), /^Source: https:\/\/example\.dev\/it\//m)
        assert.match(
            site.read('llms.txt'),
            /## Other languages\n\n- \[[^\]]+\]\(https:\/\/example\.dev\/it\/llms\.txt\)/,
            'the default llms.txt does not point at the other languages',
        )
        assert.doesNotMatch(site.read('it/llms.txt'), /## Other languages/)
    })

    test('a localised page declares its own language and its alternates', () => {
        const italian = site.read('it/index.html')
        assert.match(italian, /<html lang="it"/)
        assert.match(italian, /<link rel="alternate" hreflang="it" href="https:\/\/example\.dev\/it\/"/)

        const english = site.read('index.html')
        assert.match(english, /<html lang="en"/)
        assert.match(english, /<link rel="alternate" hreflang="x-default" href="https:\/\/example\.dev\/"/)

        // Open Graph wants language_TERRITORY; a bare tag is invalid.
        assert.match(english, /<meta property="og:locale" content="en_GB"/)
        assert.match(italian, /<meta property="og:locale" content="it_IT"/)

        // Two files at the same slug are translations, and say so both ways.
        const pair = site.read('it/guides/deep-dive/index.html')
        assert.match(pair, /<meta property="og:locale:alternate" content="en_GB"/)
        assert.match(pair, /<link rel="alternate" hreflang="en" href="https:\/\/example\.dev\/guides\/deep-dive\/"/)

        // Untranslated, so x-default still has to name somewhere to land.
        const onlyItalian = site.read('it/guides/solo-italiano/index.html')
        assert.doesNotMatch(onlyItalian, /<link rel="alternate" hreflang="en"/)
        assert.match(onlyItalian, /<link rel="alternate" hreflang="x-default" href="https:\/\/example\.dev\/"/)

        // An untranslated page advertises no alternate it does not have. The
        // switcher still links to Italian, so this looks only at <head>.
        const onlyEnglish = site.read('guides/only-in-english/index.html')
        assert.doesNotMatch(onlyEnglish, /<link rel="alternate" hreflang="it"/)
    })

    test('a shared translationKey pairs pages whose slugs differ', () => {
        const english = site.read('handbook/setup/index.html')
        assert.match(
            english,
            /<link rel="alternate" hreflang="it" href="https:\/\/example\.dev\/it\/guida\/installazione\/"/,
        )
        assert.match(
            english,
            /<a href="\/it\/guida\/installazione\/" hreflang="it"/,
            'the switcher does not follow the key',
        )

        const italian = site.read('it/guida/installazione/index.html')
        assert.match(italian, /<link rel="alternate" hreflang="en" href="https:\/\/example\.dev\/handbook\/setup\/"/)
        assert.match(italian, /<meta property="og:locale:alternate" content="en_GB"/)
    })

    test('interface strings follow the locale, key by key', () => {
        const italian = site.read('it/index.html')
        // The explicit per-locale value is rendered alongside the bundled strings.
        assert.match(italian, />Copia</)
        assert.match(italian, /title="Pagina iniziale"/)
        // Everything else comes from the bundled Italian catalogue.
        assert.match(italian, />Cerca…<\/span>/)
        assert.match(italian, /placeholder="Cerca nella documentazione…"/)
        assert.match(italian, /aria-label="Cerca nella documentazione"/)

        // English is untouched by an italian override.
        const english = site.read('index.html')
        assert.match(english, />Copy page</)
        assert.match(english, /title="Home"/)
    })

    test("structured data roots the breadcrumb in the page's own locale", () => {
        const ld = (html) => {
            return JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])
        }

        const italian = ld(site.read('it/index.html'))
        assert.equal(italian.breadcrumb.itemListElement[0].item, 'https://example.dev/it/')

        const english = ld(site.read('index.html'))
        assert.equal(english.breadcrumb.itemListElement[0].item, 'https://example.dev/')
    })

    test('the switcher ships with two locales and falls back per page', () => {
        const onlyEnglish = site.read('guides/only-in-english/index.html')
        assert.match(onlyEnglish, /<site-locale-switcher/)
        assert.match(onlyEnglish, /Italiano/)
        assert.doesNotMatch(onlyEnglish, /hreflang="fr"/, 'an empty locale was offered')
        // No Italian twin, so Italian lands on the Italian opening page.
        assert.match(onlyEnglish, /<a href="\/it\/" hreflang="it"/)

        // With a twin it links to the twin instead.
        const pair = site.read('guides/deep-dive/index.html')
        assert.match(pair, /<a href="\/it\/guides\/deep-dive\/" hreflang="it"/)
    })
})
