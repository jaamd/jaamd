import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { after, describe, test } from 'node:test'
import { siteOptionsOf } from '@jaamd/site/config.ts'
import { siteCoordinator, siteIntegration, siteMember } from '@jaamd/site/integration.ts'
import { packageVersion } from '@jaamd/site/members.ts'
import { build, sync } from 'astro'
import jaad from '../../index.ts'
import { parseConfig } from '../../src/config.ts'
import { inline, project, removeProjects } from './projects.mjs'

const VERSION = packageVersion(new URL('../../package.json', import.meta.url))

const SITE = { site: 'https://example.dev', title: 'Coordination' }

/** A project with one docs page, and the files the stub package serves. */
function withStub(files = {}) {
    return project({
        'docs/01-intro.md': '# Intro\n\nThe docs.\n',
        'stub/page.astro': '<html><body><h1>Notes</h1></body></html>\n',
        'stub/llms.mjs': [
            'export async function llmsSection() { return ["- [First note](/notes/first.md)"] }',
            'export async function llmsFullPages() { return [{ markdown: "# First note", source: "/notes/first.md" }] }',
            '',
        ].join('\n'),
        ...files,
    })
}

/** A second package of the site, as JAAB will be: its own site integration,
 *  then itself, registering one page. */
function stub(root, { base = '/notes', version = VERSION, options = SITE } = {}) {
    const site = siteIntegration({
        options: siteOptionsOf(parseConfig(options)),
        fonts: [],
        member: {
            package: '@jaamd/stub',
            version,
            label: 'Notes',
            base,
            llms: join(root, 'stub/llms.mjs'),
            notFound: null,
        },
    })
    const own = {
        name: 'stub',
        hooks: {
            'astro:config:setup': ({ injectRoute }) => {
                injectRoute({ pattern: base, entrypoint: join(root, 'stub/page.astro'), prerender: true })
                siteCoordinator(site).register(siteMember(site), { locales: [], routes: [base] })
            },
        },
    }
    return [site, own]
}

// `site` reaches Astro only through `@jaamd/jaad/site`, so it is passed here too.
const config = (root, integrations) => {
    return inline(root, integrations, { site: SITE.site })
}

const read = (root, path) => {
    return readFileSync(join(root, 'dist', path), 'utf8')
}

after(removeProjects)

describe('docs and another package on one site', () => {
    test('below the root, each keeps its llms files and the site indexes both', async () => {
        const root = withStub()
        await build(config(root, [jaad({ ...SITE, routeBase: '/docs' }), stub(root)]))

        const llms = read(root, 'llms.txt')
        assert.match(llms, /^# Coordination\n/)
        assert.match(llms, /## Docs\n\n- \[Intro\]\(https:\/\/example\.dev\/docs\/intro\.md\)/)
        assert.match(llms, /## Notes\n\n- \[First note\]/)
        assert.ok(existsSync(join(root, 'dist/docs/llms.txt')))
        assert.match(read(root, 'llms-full.txt'), /Source: \/notes\/first\.md/)

        // One sitemap, with the pages of both.
        const sitemap = read(root, 'sitemap-0.xml')
        assert.match(sitemap, /https:\/\/example\.dev\/docs\//)
        assert.match(sitemap, /https:\/\/example\.dev\/notes\//)
        assert.ok(!existsSync(join(root, 'dist/404.html')), 'a 404 without a package at the root')
    })

    test('docs at the root give the site their llms files, and keep their 404', async () => {
        const root = withStub()
        await build(config(root, [jaad(SITE), stub(root)]))

        const llms = read(root, 'llms.txt')
        assert.match(llms, /## Docs\n\n- \[Intro\]\(https:\/\/example\.dev\/intro\.md\)/)
        assert.match(llms, /## Notes/)
        assert.match(read(root, '404.html'), /jaad-not-found/)
    })
})

describe('the site stops a build whose packages disagree', () => {
    test('on versions, naming the install command', async () => {
        const root = withStub()
        await assert.rejects(
            sync(config(root, [jaad(SITE), stub(root, { version: '9.9.9' })])),
            new RegExp(`npm i @jaamd/jaad@9\\.9\\.9 @jaamd/stub@9\\.9\\.9`),
        )
    })

    test('on site options, naming the keys', async () => {
        const root = withStub()
        await assert.rejects(
            sync(config(root, [jaad(SITE), stub(root, { options: { ...SITE, title: 'Other' } })])),
            /@jaamd\/jaad and @jaamd\/stub: title/,
        )
    })

    test('on a base both take', async () => {
        const root = withStub()
        await assert.rejects(
            sync(config(root, [jaad({ ...SITE, routeBase: '/notes' }), stub(root)])),
            /both mount their pages at "\/notes"/,
        )
    })

    test('on docs pages inside the base of another package', async () => {
        const root = withStub({ 'docs/02-notes/01-draft.md': '# Draft\n' })
        await assert.rejects(
            sync(config(root, [jaad(SITE), stub(root)])),
            /docs\/02-notes\/01-draft\.md would be served at \/notes\/draft, which @jaamd\/stub serves/,
        )
    })

    test('on a project page that takes a route of a package', async () => {
        const root = withStub({ 'src/pages/notes.astro': '<h1>Mine</h1>\n' })
        await assert.rejects(
            build(config(root, [jaad({ ...SITE, routeBase: '/docs' }), stub(root)])),
            /src\/pages\/notes\.astro takes \/notes, which @jaamd\/stub serves/,
        )
    })
})
