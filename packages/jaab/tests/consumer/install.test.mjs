import assert from 'node:assert/strict'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { after, before, describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
    STRICTEST_TSCONFIG,
    TYPESCRIPT,
    cleanupTemporaryDirectories,
    jaamdOverride,
    packPackage,
    run,
    temporaryDirectory,
} from '../../../jaad/tests/consumer/helpers.mjs'
import { missingFrom, packageClasses, walk } from '../dist.mjs'

const PKG = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

const FILES = {
    'astro.config.mjs': "export { default } from '@jaamd/jaab/site'\n",
    'jaab.config.ts': [
        "import { defineJaabConfig } from '@jaamd/jaab'",
        '',
        "export default defineJaabConfig({ site: 'https://example.dev', title: 'Consumer Blog' })",
        '',
    ].join('\n'),
    'src/content.config.ts': "export { collections } from '@jaamd/jaab/content'\n",
    'tsconfig.json': STRICTEST_TSCONFIG,
    // Every entry a project imports from TypeScript.
    'src/entries.ts': [
        "import jaab, { defineJaabConfig, defineSiteConfig } from '@jaamd/jaab'",
        "import { collections } from '@jaamd/jaab/content'",
        "import type { BlogLayoutProps, BlogPost } from '@jaamd/jaab/layout'",
        "import { getPosts } from '@jaamd/jaab/posts'",
        '',
        'export const entries = [jaab, defineJaabConfig, defineSiteConfig, collections, getPosts]',
        'export type Layout = BlogLayoutProps | BlogPost',
        '',
    ].join('\n'),
}

/**
 * Installs the packed tarball into a throwaway project, the way a reader
 * would, and writes its first post with the bin. What JAAB does with the
 * posts is tested on the build fixture, in tests/build.
 */
describe('a project that installed the published tarball', () => {
    let project
    let tarball

    before(() => {
        tarball = packPackage(PKG)
        project = temporaryDirectory('jaab-consumer-')

        for (const [path, content] of Object.entries(FILES)) {
            mkdirSync(join(project, path, '..'), { recursive: true })
            writeFileSync(join(project, path), content)
        }
        const manifest = {
            name: 'consumer-blog',
            private: true,
            type: 'module',
            dependencies: { astro: '7.3.1', '@jaamd/jaab': tarball },
            devDependencies: TYPESCRIPT,
            overrides: jaamdOverride(),
        }
        writeFileSync(join(project, 'package.json'), JSON.stringify(manifest, null, 2))

        run('npm', ['install', '--no-audit', '--no-fund'], project)
        run('npx', ['jaab', 'new', 'Hello from the tarball'], project)
        run('npx', ['astro', 'build'], project)
    })

    after(cleanupTemporaryDirectories)

    test('jaab new writes a post the build publishes', () => {
        assert.equal(existsSync(join(project, 'blog/hello-from-the-tarball.md')), true)
        const post = readFileSync(join(project, 'dist/hello-from-the-tarball/index.html'), 'utf8')
        assert.match(post, /<h1>Hello from the tarball<\/h1>/)
        assert.match(readFileSync(join(project, 'dist/rss.xml'), 'utf8'), /Hello from the tarball/)
    })

    test('the published sources type-check under strictest', () => {
        run('npx', ['tsc', '--noEmit'], project)
    })

    test("the package's own styles survive a transitive install", () => {
        const dist = join(project, 'dist')
        const css = walk(dist)
            .filter((file) => {
                return file.endsWith('.css') || file.endsWith('.html')
            })
            .map((file) => {
                return readFileSync(file, 'utf8')
            })
            .join('\n')
        assert.deepEqual(missingFrom(css, packageClasses(join(PKG, 'src'))), [])
    })

    test('the tarball ships the sources, the stylesheet and the bin, not the tests', () => {
        const listing = run('tar', ['-tzf', tarball], project)
        assert.match(listing, /package\/bin\/jaab\.mjs/)
        assert.match(listing, /package\/dist\/jaab\.css/)
        assert.match(listing, /package\/src\/routes\/post\.astro/)
        assert.doesNotMatch(listing, /package\/tests\//)
    })
})
