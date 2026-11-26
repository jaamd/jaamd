import assert from 'node:assert/strict'
import { cpSync, writeFileSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { after, before, describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { walk, packageClasses, missingFrom } from '../dist.mjs'
import {
    STRICTEST_TSCONFIG,
    TYPESCRIPT,
    cleanupTemporaryDirectories,
    jaamdOverride,
    packPackage,
    run,
    temporaryDirectory,
} from './helpers.mjs'

// Every entry a project imports from TypeScript.
const ENTRIES = [
    "import jaad, { defineJaadConfig, defineSiteConfig } from '@jaamd/jaad'",
    "import type { DocsFrameProps } from '@jaamd/jaad/advanced'",
    "import { collections } from '@jaamd/jaad/content'",
    "import { markdownPathFor } from '@jaamd/jaad/negotiation'",
    '',
    'export const entries = [jaad, defineJaadConfig, defineSiteConfig, collections, markdownPathFor]',
    'export type Frame = DocsFrameProps',
    '',
].join('\n')

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..', '..')
const PKG = ROOT

/** The built files, read once: each by its path, and the CSS of all of them. */
function snapshot(dist) {
    const contents = new Map(
        walk(dist).map((file) => {
            return [file.slice(dist.length), readFileSync(file, 'utf8')]
        }),
    )

    return {
        read: (relative) => {
            const file = contents.get('/' + relative)
            assert.ok(file !== undefined, `${relative} was not built`)
            return file
        },
        css: [...contents]
            .filter(([file]) => {
                return file.endsWith('.css') || file.endsWith('.html')
            })
            .map(([, body]) => {
                return body
            })
            .join('\n'),
    }
}

/**
 * Installs the packed tarball into a throwaway project, the way a reader would.
 * Everything that has broken so far — transitive resolution, Tailwind scanning
 * node_modules, .astro files shipped as source — only shows up here. What JAAD
 * does with the docs is tested on the build fixture, in tests/build.
 */
describe('a project that installed the published tarball', () => {
    let project
    let built

    before(() => {
        const tarball = packPackage(PKG)

        project = temporaryDirectory('jaad-consumer-')
        cpSync(join(HERE, 'fixture'), project, { recursive: true })
        writeFileSync(
            join(project, 'package.json'),
            JSON.stringify(
                {
                    name: 'consumer-test',
                    private: true,
                    type: 'module',
                    dependencies: {
                        astro: '7.3.1',
                        '@jaamd/jaad': tarball,
                    },
                    devDependencies: TYPESCRIPT,
                    overrides: jaamdOverride(),
                },
                null,
                2,
            ),
        )

        writeFileSync(join(project, 'tsconfig.json'), STRICTEST_TSCONFIG)
        writeFileSync(join(project, 'src/entries.ts'), ENTRIES)

        run('npm', ['install', '--no-audit', '--no-fund'], project)
        run('npx', ['astro', 'build'], project)
        built = snapshot(join(project, 'dist'))
    })

    after(cleanupTemporaryDirectories)

    test('the published sources type-check under strictest', () => {
        run('npx', ['tsc', '--noEmit'], project)
    })

    test('the config reaches the head of the page', () => {
        const home = built.read('index.html')
        // `site` arrives through the wrapper, so urls are absolute.
        assert.match(home, /<link rel="canonical" href="https:\/\/example\.dev/)
        assert.match(home, /<img src="\/logo\.svg"/, 'logo not rendered')
        assert.match(home, /<meta name="consumer-probe" content="ok"/, 'head entry not injected')
        assert.match(
            built.read('404.html'),
            /<title>404 \| Consumer Test<\/title>/,
            "the 404 page does not carry the consumer's own title",
        )
        assert.doesNotMatch(
            home,
            /(?:property|name)="(?:og:image|twitter:image)"/,
            'a missing social image was advertised',
        )
        assert.match(home, /name="twitter:card" content="summary"/)
    })

    test("a page of the consumer's own keeps its local layout", () => {
        const custom = built.read('about/index.html')
        assert.match(custom, /<title>About \| Consumer Test<\/title>/)
        assert.match(custom, /<body data-site-layout>/)
        assert.doesNotMatch(custom, /jaad-chrome/)
    })

    test('the page layout puts the site chrome around a page of your own', () => {
        const page = built.read('page/index.html')
        assert.match(page, /<title>Changelog \| Consumer Test<\/title>/)
        assert.match(page, /data-page-layout/)
        assert.match(page, /<main class="site-main-bare jaad-main-bare">/)
        assert.match(page, /<header[^>]*class="site-header jaad-header"/, 'no header chrome')
        assert.match(page, /aria-label="GitHub"/, 'no configured social links')
        assert.doesNotMatch(page, /<body data-docs/, 'the docs body leaked in')
    })

    test('the conventional docs frame receives and arranges semantic slots', () => {
        const home = built.read('index.html')
        assert.match(home, /data-custom-docs-frame[^>]*data-page-id="01-getting-started"/)
        assert.match(home, /data-page-title="Frontmatter Wins"/)
        assert.ok(
            home.indexOf('data-copy-page') < home.indexOf('<h1'),
            'the custom frame did not move page actions before the content',
        )
        assert.doesNotMatch(home, /<footer/, 'the omitted footer was rendered')
        assert.match(
            built.css.replace(/\s+/g, ''),
            /\[data-jaad-default-frame\]\.docs-sidebar-left[^}]*position:fixed/,
            'default positioning is not scoped away from custom frames',
        )
    })

    test("the package's own styles survive a transitive install", () => {
        // The jaad-* classes are aliases of the site-* ones, with no rule of their own.
        const classes = [...packageClasses(join(PKG, 'src'))].filter((name) => {
            return !name.startsWith('jaad-')
        })
        assert.deepEqual(missingFrom(built.css, new Set(classes)), [], 'package utilities missing from the CSS')
        assert.ok(
            built.css.includes('var(--shiki-light)'),
            "jaamd's dual-theme CSS did not survive the transitive install",
        )
        assert.ok(built.css.includes('--jaamd-'), 'jaamd markdown styles missing')
    })

    test('src/jaad.css overrides colours and widths alike', () => {
        // The convention is worthless unless it lands after the package's tokens.
        const tokenAt = built.css.indexOf('--color-background:')
        const overrideAt = built.css.indexOf('#3b5bdb')
        assert.notEqual(overrideAt, -1, 'src/jaad.css was not picked up')
        assert.ok(overrideAt > tokenAt, 'src/jaad.css loaded before the package tokens, so it cannot override them')

        const width = built.css.lastIndexOf('--jaad-content-width:')
        assert.notEqual(width, -1, 'the layout tokens did not ship')
        assert.match(
            built.css.slice(width, width + 40),
            /--jaad-content-width:\s*71rem/,
            'the content width override did not win',
        )
    })
})
