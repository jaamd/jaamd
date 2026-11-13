import assert from 'node:assert/strict'
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { after, before, describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { cleanupTemporaryDirectories, jaamdOverride, packPackage, run, temporaryDirectory } from './helpers.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const PKG = join(HERE, '..', '..')

// Two sections: one directory in the project, one beside it.
describe('a project whose docs are split into sections', () => {
    let dist
    let localised

    const page = (path) => readFileSync(join(dist, path), 'utf8')
    const write = (file, content) => {
        mkdirSync(dirname(file), { recursive: true })
        writeFileSync(file, content)
    }

    before(() => {
        const parent = temporaryDirectory('jaad-sections-')
        const project = join(parent, 'site')
        cpSync(join(HERE, 'fixture'), project, { recursive: true })
        rmSync(join(project, 'docs'), { recursive: true })

        write(
            join(project, 'guide', '01-intro.md'),
            '# Intro\n\n[Install](./02-setup/01-install.md#steps), [Client](../../shared/api/01-client.md), [Astro](https://astro.build).\n',
        )
        write(join(project, 'guide', '02-setup', '01-install.md'), '# Install\n\n## Steps\n\n[Back](../01-intro.md)\n')
        write(join(parent, 'shared', 'api', '01-client.md'), '# Client\n\nThe client.\n')
        write(join(parent, 'shared', 'api', '02-server.md'), '# Server\n\nThe server.\n')

        writeFileSync(
            join(project, 'package.json'),
            JSON.stringify({
                name: 'sections-test',
                private: true,
                type: 'module',
                dependencies: { astro: '7.3.1', '@astrojs/markdown-remark': '^7.3.0', '@jaamd/jaad': packPackage(PKG) },
                overrides: jaamdOverride(),
            }),
        )
        writeFileSync(
            join(project, 'jaad.config.ts'),
            `import { defineJaadConfig } from "@jaamd/jaad";
export default defineJaadConfig({
  site: "https://example.dev",
  title: "Sections Test",
  sections: {
    guide: { dir: "./guide", label: "The Guide" },
    api: { dir: "../shared/api" },
  },
});
`,
        )

        run('npm', ['install', '--no-audit', '--no-fund'], project)
        run('npx', ['astro', 'build'], project)
        dist = join(parent, 'dist-sections')
        cpSync(join(project, 'dist'), dist, { recursive: true })

        // The same sections in two languages, on unified, plus one with nothing to serve.
        rmSync(join(project, 'guide'), { recursive: true })
        rmSync(join(parent, 'shared'), { recursive: true })
        for (const locale of ['en', 'it']) {
            write(join(project, 'guide', locale, '01-intro.md'), `# Intro ${locale}\n\n[Next](./02-next.md)\n`)
            write(join(project, 'guide', locale, '02-next.md'), `# Next ${locale}\n`)
            write(join(project, 'drafts', locale, '01-soon.md'), '---\ndraft: true\n---\n\n# Soon\n')
            write(join(parent, 'shared', 'api', locale, '01-client.md'), `# Client ${locale}\n`)
        }
        writeFileSync(
            join(project, 'jaad.config.ts'),
            `import { unified } from "@astrojs/markdown-remark";
import { defineJaadConfig } from "@jaamd/jaad";
export default defineJaadConfig({
  site: "https://example.dev",
  title: "Sections Test",
  sections: {
    drafts: { dir: "./drafts" },
    guide: { dir: "./guide" },
    api: { dir: "../shared/api" },
  },
  astro: { markdown: { processor: unified() } },
});
`,
        )
        run('npx', ['astro', 'build'], project)
        localised = join(project, 'dist')
    })

    after(cleanupTemporaryDirectories)

    test('the first page of the first section opens the docs', () => {
        assert.match(page('index.html'), /<h1[^>]*>Intro/)
        assert.match(page('guide/intro/index.html'), /http-equiv="refresh"[^>]*url=\/"/)
        assert.match(page('guide/index.html'), /http-equiv="refresh"[^>]*url=\/"/)
    })

    test('the first page of a later section owns the section url', () => {
        assert.match(page('api/index.html'), /<h1[^>]*>Client/)
        assert.match(page('api/client/index.html'), /http-equiv="refresh"[^>]*url=\/api"/)
        assert.match(page('api/server/index.html'), /<h1[^>]*>Server/)
    })

    test('the header lists the sections and marks the current one', () => {
        const home = page('index.html')
        assert.match(home, /<a href="\/" class="jaad-nav-link" aria-current="true"[^>]*>\s*The Guide/)
        assert.match(home, /<a href="\/api" class="jaad-nav-link"[^>]*>\s*Api/)
        assert.match(page('api/server/index.html'), /<a href="\/api" class="jaad-nav-link" aria-current="true"/)
    })

    test('the sidebar and the page navigation stay inside the section', () => {
        const sidebar = (html) => html.slice(html.indexOf('docs-sidebar-left'), html.indexOf('</aside>'))
        assert.match(sidebar(page('index.html')), /Install/)
        assert.doesNotMatch(sidebar(page('index.html')), /Client|Server/)
        assert.doesNotMatch(sidebar(page('api/server/index.html')), /Intro|Install/)

        // The last page of a section has no next page in the following one.
        assert.doesNotMatch(
            page('guide/setup/install/index.html'),
            /href="\/api"[^>]*rel="next"|rel="next"[^>]*href="\/api"/,
        )
    })

    test('the breadcrumbs name the section', () => {
        const install = page('guide/setup/install/index.html')
        const crumbs = install.slice(
            install.indexOf('docs-breadcrumbs'),
            install.indexOf('</nav>', install.indexOf('docs-breadcrumbs')),
        )
        assert.match(crumbs, /The Guide/)
        assert.match(crumbs, /Setup/)
    })

    test('a relative link to a markdown file becomes the page url', () => {
        const home = page('index.html')
        assert.match(home, /<a href="\/guide\/setup\/install#steps">Install<\/a>/)
        assert.match(home, /<a href="\/api\/client">Client<\/a>/)
        assert.match(home, /<a href="https:\/\/astro\.build"/)
        assert.match(page('guide/setup/install/index.html'), /<a href="\/guide\/intro">Back<\/a>/)
    })

    test('llms.txt groups the pages by section', () => {
        const llms = page('llms.txt')
        assert.match(llms, /## The Guide\n\n- \[Intro\]\(https:\/\/example\.dev\/guide\/intro\.md\)/)
        assert.match(llms, /### Setup\n\n- \[Install\]/)
        assert.match(llms, /## Api\n\n- \[Client\]\(https:\/\/example\.dev\/api\/client\.md\)/)
    })

    test('the raw markdown and the search index use the section urls', () => {
        assert.ok(existsSync(join(dist, 'api/server.md')))
        const slugs = JSON.parse(page('search-index.json')).map((entry) => entry.slug)
        assert.deepEqual(slugs, ['', 'guide/setup/install', 'api', 'api/server'])
    })

    describe('localised, on unified, with a section that has no pages', () => {
        const built = (path) => readFileSync(join(localised, path), 'utf8')

        test('each language opens on its own first page', () => {
            assert.match(built('index.html'), /<h1[^>]*>Intro en/)
            assert.match(built('it/index.html'), /<h1[^>]*>Intro it/)
            assert.match(built('it/api/index.html'), /<h1[^>]*>Client it/)
        })

        test('the rehype plugin keeps a relative link in its language', () => {
            assert.match(built('index.html'), /<a href="\/guide\/next">Next<\/a>/)
            assert.match(built('it/index.html'), /<a href="\/it\/guide\/next">Next<\/a>/)
        })

        test('a section with nothing to serve is not linked, and the next one opens the docs', () => {
            const home = built('index.html')
            assert.doesNotMatch(home, /Drafts/)
            assert.ok(!existsSync(join(localised, 'drafts')))
            assert.match(home, /<a href="\/" class="jaad-nav-link" aria-current="true"[^>]*>\s*Guide/)
            assert.match(
                built('it/index.html'),
                /<a href="\/it" class="jaad-nav-link" aria-current="true"[^>]*>\s*Guide/,
            )
            assert.match(built('it/index.html'), /<a href="\/it\/api" class="jaad-nav-link"/)
        })
    })
})
