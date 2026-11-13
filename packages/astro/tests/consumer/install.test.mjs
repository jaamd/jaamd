import assert from 'node:assert/strict'
import { cpSync, existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { after, before, describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { cleanupTemporaryDirectories, jaamdOverride, run, temporaryDirectory } from './helpers.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const CORE_STYLES = join(HERE, '..', '..', '..', 'core', 'src', 'styles')
const DOCS = join(HERE, '..', '..', 'docs')

// pnpm: strict layout, so `@jaamd/core` is reachable only through `@jaamd/astro`.
describe('a pnpm project that installed the packed tarballs', () => {
    let project
    let html
    let css

    before(() => {
        const { '@jaamd/astro': astro, '@jaamd/core': core } = jaamdOverride()

        project = temporaryDirectory('jaamd-consumer-')
        cpSync(join(HERE, 'fixture'), project, { recursive: true })
        writeFileSync(
            join(project, 'package.json'),
            JSON.stringify({
                name: 'consumer-test',
                private: true,
                type: 'module',
                dependencies: { astro: '7.3.1', '@jaamd/astro': astro },
            }),
        )
        writeFileSync(
            join(project, 'pnpm-workspace.yaml'),
            `allowBuilds:\n  esbuild: true\noverrides:\n  '@jaamd/core': '${core}'\n`,
        )

        run('pnpm', ['install', '--config.minimum-release-age=0'], project)
        run('pnpm', ['exec', 'astro', 'build'], project)

        const assets = join(project, 'dist', '_astro')
        html = readFileSync(join(project, 'dist', 'index.html'), 'utf8')
        css = [
            ...readdirSync(assets)
                .filter((file) => file.endsWith('.css'))
                .map((file) => readFileSync(join(assets, file), 'utf8')),
            ...[...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]),
        ].join('\n')
    })

    after(cleanupTemporaryDirectories)

    test('the plugins ran', () => {
        assert.match(html, /class="markdown-alert markdown-alert-note"/)
        assert.match(html, /class="jaamd-table-wrapper"/)
        assert.match(html, /<h2 id="setup">Setup<a class="jaamd-heading-link" href="#setup"/)
    })

    test('the only copy of @astrojs/markdown-satteri is the one Astro installs', () => {
        const copies = readdirSync(join(project, 'node_modules', '.pnpm')).filter((dir) =>
            dir.startsWith('@astrojs+markdown-satteri@'),
        )
        assert.equal(copies.length, 1, copies.join(', '))
    })

    test('the documentation is installed with the package', () => {
        const installed = join(project, 'node_modules', '@jaamd', 'astro', 'docs')
        const missing = readdirSync(DOCS, { recursive: true })
            .filter((file) => file.endsWith('.md'))
            .filter((file) => !existsSync(join(installed, file)))
        assert.deepEqual(missing, [])
    })

    test('the client script is bundled', () => {
        assert.match(html, /<script[^>]+type="module"/)
    })

    // Injected by the integration, imported by <MarkdownContent> and by the page.
    test('each stylesheet reaches the page once', () => {
        for (const [file, marker] of [
            ['markdown.css', /\.jaamd-heading-link \{/g],
            ['variables.css', /--jaamd-bg:/g],
        ]) {
            const source = readFileSync(join(CORE_STYLES, file), 'utf8')
            assert.equal((css.match(marker) ?? []).length, (source.match(marker) ?? []).length, file)
        }
    })
})
