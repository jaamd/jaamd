import type { SiteConfig } from '../../src/config.ts'
import type { SiteContribution } from '../../src/integration.ts'
import type { SiteInstance, SiteMember } from '../../src/members.ts'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { pathToFileURL } from 'node:url'
import { projectClashes, projectFileAt } from '../../src/integration.ts'
import {
    assertOneVersion,
    assertSameOptions,
    assertSeparateBases,
    compareVersions,
    notFoundPage,
    pathsReservedInside,
    rootLlmsServer,
} from '../../src/members.ts'

const member = (fields: Partial<SiteMember> = {}): SiteMember => {
    return {
        package: '@jaamd/jaad',
        version: '1.2.0',
        label: 'Docs',
        base: '',
        llms: '/llms.ts',
        notFound: '/404.astro',
        ...fields,
    }
}

const OPTIONS = { title: 'Site', theme: 'default', nav: [] } as unknown as SiteConfig

const instance = (fields: Partial<SiteMember> = {}, options: object = {}, version = '1.2.0'): SiteInstance => {
    return {
        version,
        entry: { options: { ...OPTIONS, ...options }, fonts: [], member: member(fields) },
    }
}

test('versions sort by number, a release above its prereleases', () => {
    const sorted = ['1.10.0', '1.2.0', '1.2.0-rc.2', '1.2.0-rc.10', '1.9.1'].toSorted(compareVersions)
    assert.deepEqual(sorted, ['1.2.0-rc.2', '1.2.0-rc.10', '1.2.0', '1.9.1', '1.10.0'])
})

test('packages on different versions fail with the command that aligns them', () => {
    assert.doesNotThrow(() => {
        assertOneVersion([instance(), instance({ package: '@jaamd/jaab', base: '/blog' })])
    })

    const jaab = instance({ package: '@jaamd/jaab', version: '1.3.0', base: '/blog' }, {}, '1.3.0')
    assert.throws(() => {
        assertOneVersion([instance(), jaab])
    }, /@jaamd\/jaad 1\.2\.0, with @jaamd\/site 1\.2\.0\n {2}@jaamd\/jaab 1\.3\.0[^]*npm i @jaamd\/jaad@1\.3\.0 @jaamd\/jaab@1\.3\.0/)
})

test('a copy of the site on another version fails as well', () => {
    assert.throws(() => {
        assertOneVersion([instance({}, {}, '1.1.0')])
    }, /npm i @jaamd\/jaad@1\.2\.0/)
})

test('site options that differ are named, key by key', () => {
    const jaab = (options: object) => {
        return instance({ package: '@jaamd/jaab', base: '/blog' }, options)
    }

    assert.doesNotThrow(() => {
        assertSameOptions([instance(), jaab({ nav: [] })])
    })
    assert.throws(() => {
        assertSameOptions([instance(), jaab({ title: 'Blog', theme: 'dracula' })])
    }, /@jaamd\/jaad and @jaamd\/jaab: title, theme\n/)
})

test('each package once, and at a base of its own', () => {
    assert.doesNotThrow(() => {
        assertSeparateBases([member(), member({ package: '@jaamd/jaab', base: '/blog' })])
    })
    assert.throws(() => {
        assertSeparateBases([member(), member({ base: '/docs' })])
    }, /@jaamd\/jaad is in the integrations twice/)
    assert.throws(() => {
        assertSeparateBases([member({ base: '/x' }), member({ package: '@jaamd/jaab', base: '/x' })])
    }, /both mount their pages at "\/x"/)
})

test("a package's pages stay out of the bases inside its own", () => {
    const docs = member()
    const blog = member({ package: '@jaamd/jaab', base: '/blog' })
    const nested = member({ package: '@jaamd/other', base: '/blog/news' })
    const members = [docs, blog, nested]

    assert.deepEqual(pathsReservedInside(members, docs), [
        { path: 'blog', package: '@jaamd/jaab' },
        { path: 'blog/news', package: '@jaamd/other' },
    ])
    assert.deepEqual(pathsReservedInside(members, blog), [{ path: 'news', package: '@jaamd/other' }])
    // A shared prefix is not a directory: /blogroll is not inside /blog.
    assert.deepEqual(pathsReservedInside([blog, member({ base: '/blogroll' })], blog), [])
})

test('the root llms files are the only writer at the root, the site otherwise', () => {
    const docs = member()
    const blog = member({ package: '@jaamd/jaab', base: '/blog' })

    assert.equal(rootLlmsServer([docs]), docs)
    assert.equal(rootLlmsServer([member({ base: '/docs' })]), 'site')
    assert.equal(rootLlmsServer([docs, blog]), 'site')
    assert.equal(rootLlmsServer([docs, member({ ...blog, llms: null })]), docs)
    assert.equal(rootLlmsServer([member({ llms: null })]), null)
})

test('the 404 comes with the package mounted at the root', () => {
    assert.equal(notFoundPage([member()]), '/404.astro')
    assert.equal(notFoundPage([member({ base: '/docs' })]), null)
    assert.equal(notFoundPage([member({ base: '/docs' }), member({ package: '@jaamd/jaab' })]), '/404.astro')
})

test('a project page on the route of a package is a clash, any other route is not', () => {
    const contributions = new Map<string, SiteContribution>([
        ['@jaamd/jaab', { locales: [], routes: ['/blog', '/blog/[...page]'] }],
    ])
    const route = (pattern: string, origin: 'project' | 'external', entrypoint: string) => {
        return { pattern, origin, entrypoint }
    }

    const clashes = projectClashes(
        [
            route('/blog/', 'project', 'src/pages/blog/index.astro'),
            route('/blog/[...page]', 'external', 'jaab/routes/page.astro'),
            route('/about', 'project', 'src/pages/about.astro'),
        ],
        contributions,
    )
    assert.deepEqual(clashes, ['src/pages/blog/index.astro takes /blog/, which @jaamd/jaab serves'])
})

test("a project's own page, or a file in public, answers at a path", () => {
    const root = mkdtempSync(join(tmpdir(), 'jaamd-project-file-'))
    const srcDir = pathToFileURL(join(root, 'src/'))
    const publicDir = pathToFileURL(join(root, 'public/'))

    try {
        assert.equal(projectFileAt('404', ['astro', 'md'], srcDir), null)

        mkdirSync(join(root, 'src/pages'), { recursive: true })
        writeFileSync(join(root, 'src/pages/404.md'), '# Mine')
        assert.equal(projectFileAt('404', ['astro', 'md'], srcDir), join(root, 'src/pages/404.md'))

        mkdirSync(join(root, 'public'))
        writeFileSync(join(root, 'public/llms.txt'), '# Mine')
        assert.equal(projectFileAt('llms.txt', ['ts'], srcDir), null)
        assert.equal(projectFileAt('llms.txt', ['ts'], srcDir, publicDir), join(root, 'public/llms.txt'))
    } finally {
        rmSync(root, { recursive: true })
    }
})
