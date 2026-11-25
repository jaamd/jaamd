import assert from 'node:assert/strict'
import { after, before, describe, test } from 'node:test'
import { unified } from '@astrojs/markdown-remark'
import { build } from 'astro'
import jaad from '../../index.ts'
import { built, inline, project, removeProjects } from './projects.mjs'

const SITE = 'https://example.dev'

after(removeProjects)

// Two sections: one directory in the project, one beside it.
describe('a project whose docs are split into sections', () => {
    let guide

    before(async () => {
        const root = project({
            'guide/01-intro.md':
                '# Intro\n\n[Install](./02-setup/01-install.md#steps), [Client](../../shared/api/01-client.md), [Astro](https://astro.build).\n',
            'guide/02-setup/01-install.md': '# Install\n\n## Steps\n\n[Back](../01-intro.md)\n',
            '../shared/api/01-client.md': '# Client\n\nThe client.\n',
            '../shared/api/02-server.md': '# Server\n\nThe server.\n',
        })
        const sections = {
            guide: { dir: './guide', label: 'The Guide' },
            api: { dir: '../shared/api' },
        }
        await build(inline(root, [jaad({ site: SITE, title: 'Sections Test', sections })], { site: SITE }))
        guide = built(root)
    })

    test('the first page of the first section opens the docs', () => {
        assert.match(guide.read('index.html'), /<h1[^>]*>Intro/)
        assert.match(guide.read('guide/intro/index.html'), /http-equiv="refresh"[^>]*url=\/"/)
        assert.match(guide.read('guide/index.html'), /http-equiv="refresh"[^>]*url=\/"/)
    })

    test('the first page of a later section owns the section url', () => {
        assert.match(guide.read('api/index.html'), /<h1[^>]*>Client/)
        assert.match(guide.read('api/client/index.html'), /http-equiv="refresh"[^>]*url=\/api\/"/)
        assert.match(guide.read('api/server/index.html'), /<h1[^>]*>Server/)
    })

    test('the sidebar lists every section, each with its own pages', () => {
        const sidebar = (html) => {
            return html.slice(html.indexOf('docs-sidebar-left'), html.indexOf('</aside>'))
        }
        const home = sidebar(guide.read('index.html'))
        assert.match(
            home,
            /docs-sidebar-section-title">The Guide<[\s\S]*Install[\s\S]*docs-sidebar-section-title">Api<[\s\S]*Server/,
        )
        assert.match(
            sidebar(guide.read('api/server/index.html')),
            /Intro[\s\S]*href="\/api\/server\/"[^>]*aria-current="page"/,
        )

        const header = guide.read('index.html').match(/<header[\s\S]*?<\/header>/)[0]
        assert.doesNotMatch(header, /The Guide|Api/, 'the sections are in the header')
    })

    test('the page navigation runs on into the next section', () => {
        assert.match(
            guide.read('guide/setup/install/index.html'),
            /href="\/api\/"[^>]*rel="next"|rel="next"[^>]*href="\/api\/"/,
        )
    })

    test('the breadcrumbs name the section', () => {
        const install = guide.read('guide/setup/install/index.html')
        const crumbs = install.slice(
            install.indexOf('docs-breadcrumbs'),
            install.indexOf('</nav>', install.indexOf('docs-breadcrumbs')),
        )
        assert.match(crumbs, /The Guide/)
        assert.match(crumbs, /Setup/)
    })

    test('a relative link to a markdown file becomes the page url', () => {
        const home = guide.read('index.html')
        assert.match(home, /<a href="\/guide\/setup\/install\/#steps">Install<\/a>/)
        assert.match(home, /<a href="\/api\/client\/">Client<\/a>/)
        assert.match(home, /<a href="https:\/\/astro\.build"/)
        assert.match(guide.read('guide/setup/install/index.html'), /<a href="\/guide\/intro\/">Back<\/a>/)
    })

    test('llms.txt groups the pages by section', () => {
        const llms = guide.read('llms.txt')
        assert.match(llms, /## The Guide\n\n- \[Intro\]\(https:\/\/example\.dev\/guide\/intro\.md\)/)
        assert.match(llms, /### Setup\n\n- \[Install\]/)
        assert.match(llms, /## Api\n\n- \[Client\]\(https:\/\/example\.dev\/api\/client\.md\)/)
    })

    test('the raw markdown and the search index use the section urls', () => {
        assert.ok(guide.files.includes('/api/server.md'))
        const index = JSON.parse(guide.read('search-index.json'))
        assert.deepEqual(
            index.pages.map((entry) => {
                return [entry.href, entry.section]
            }),
            [
                ['/', 'guide'],
                ['/guide/setup/install/', 'guide'],
                ['/api/', 'api'],
                ['/api/server/', 'api'],
            ],
        )
        assert.deepEqual(
            index.sections.map((section) => {
                return section.label
            }),
            ['The Guide', 'Api'],
        )
    })
})

describe('sections in two languages, on unified, with one that has no pages', () => {
    let localised

    before(async () => {
        const files = {}
        for (const locale of ['en', 'it']) {
            files[`guide/${locale}/01-intro.md`] = `# Intro ${locale}\n\n[Next](./02-next.md)\n`
            files[`guide/${locale}/02-next.md`] = `# Next ${locale}\n`
            files[`drafts/${locale}/01-soon.md`] = '---\ndraft: true\n---\n\n# Soon\n'
            files[`../shared/api/${locale}/01-client.md`] = `# Client ${locale}\n`
        }
        const root = project(files)
        const sections = {
            drafts: { dir: './drafts' },
            guide: { dir: './guide' },
            api: { dir: '../shared/api' },
        }
        await build(
            inline(root, [jaad({ site: SITE, title: 'Sections Test', sections })], {
                site: SITE,
                markdown: { processor: unified() },
            }),
        )
        localised = built(root)
    })

    test('each language opens on its own first page', () => {
        assert.match(localised.read('index.html'), /<h1[^>]*>Intro en/)
        assert.match(localised.read('it/index.html'), /<h1[^>]*>Intro it/)
        assert.match(localised.read('it/api/index.html'), /<h1[^>]*>Client it/)
    })

    test('the rehype plugin keeps a relative link in its language', () => {
        assert.match(localised.read('index.html'), /<a href="\/guide\/next\/">Next<\/a>/)
        assert.match(localised.read('it/index.html'), /<a href="\/it\/guide\/next\/">Next<\/a>/)
    })

    test('a section with nothing to serve is not linked, and the next one opens the docs', () => {
        const home = localised.read('index.html')
        assert.doesNotMatch(home, /Drafts/)
        assert.ok(
            !localised.files.some((file) => {
                return file.startsWith('/drafts')
            }),
        )
        assert.match(home, /docs-sidebar-section-title">Guide<[\s\S]*docs-sidebar-section-title">Api</)
        assert.match(localised.read('it/index.html'), /href="\/it\/api\/"/)
    })
})
