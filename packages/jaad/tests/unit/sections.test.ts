import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { resolveConfig } from '../../src/config.ts'
import { findOpeningPages } from '../../src/integration.ts'
import { rehypeDocLinks } from '../../src/link-plugins.ts'
import { buildDocsNavigation } from '../../src/navigation.ts'
import {
    collectionIdFor,
    docSlug,
    getCanonicalDocSlug,
    sortDocPages,
    splitDocSection,
    validateDocsStructure,
} from '../../src/utils/docs.ts'
import { resolveDocLink } from '../../src/utils/links.ts'

const urls = { docsBase: '' }

/** Pages as the collection hands them over, section attached. */
const inSections = (...ids: string[]) =>
    ids.map((id) => {
        const [section, ...rest] = id.split('/')
        return { id, localeId: rest.join('/'), section, sectionOrder: ['guide', 'api'].indexOf(section) }
    })

function withTree(files: Record<string, string>, run: (root: string) => void) {
    const root = mkdtempSync(join(tmpdir(), 'jaad-sections-'))
    try {
        for (const [file, content] of Object.entries(files)) {
            mkdirSync(join(root, file, '..'), { recursive: true })
            writeFileSync(join(root, file), content)
        }
        run(root)
    } finally {
        rmSync(root, { recursive: true })
    }
}

// ── Ids ──────────────────────────────────────────────────────────────────────

test('a section is split off the id only when it is a declared one', () => {
    assert.deepEqual(splitDocSection('api/01-client', ['guide', 'api']), { section: 'api', id: '01-client' })
    assert.deepEqual(splitDocSection('02-guides/01-setup', ['guide', 'api']), {
        section: null,
        id: '02-guides/01-setup',
    })
    assert.deepEqual(splitDocSection('api', ['api']), { section: null, id: 'api' })
})

test('a file gets the key of the section its directory is', () => {
    assert.equal(collectionIdFor('02-setup/01-install.md', 'guide', []), 'guide/02-setup/01-install')
    assert.equal(collectionIdFor('02-setup\\01-install.md', 'guide', []), 'guide/02-setup/01-install')
})

test('the locale stays in front of the section', () => {
    assert.equal(collectionIdFor('it/01-intro.md', 'guide', ['en', 'it']), 'it/guide/01-intro')
})

test('without sections the id is the path', () => {
    assert.equal(collectionIdFor('02-guides/01-setup.md', undefined, []), '02-guides/01-setup')
})

// ── Order and urls ───────────────────────────────────────────────────────────

test('sections sort in the declared order, pages by their own inside each', () => {
    const pages = inSections('api/02-server', 'guide/02-setup/01-install', 'api/01-client', 'guide/01-intro')
    assert.deepEqual(
        sortDocPages(pages).map((page) => page.id),
        ['guide/01-intro', 'guide/02-setup/01-install', 'api/01-client', 'api/02-server'],
    )
})

test('the slug of a page starts with its section', () => {
    const [install] = inSections('guide/02-setup/01-install')
    assert.equal(docSlug(install), 'guide/setup/install')
})

test('the first page opens the docs, the first of a later section opens the section', () => {
    const pages = inSections('guide/01-intro', 'guide/02-next', 'api/01-client', 'api/02-server')
    assert.deepEqual(
        pages.map((page, index) => getCanonicalDocSlug(page, index, pages)),
        ['', 'guide/next', 'api', 'api/server'],
    )
})

test('two sections may hold the same chapter and the same page name', () => {
    assert.doesNotThrow(() => {
        validateDocsStructure(inSections('guide/01-setup/01-install', 'api/01-setup/01-install'))
    })
})

test('a conflict inside a section names the section', () => {
    assert.throws(() => {
        validateDocsStructure(inSections('api/01-client', 'api/02-client'))
    }, /api\/01-client, api\/02-client all resolve to \/api\/client/)
})

test('one chapter level is the limit inside a section too', () => {
    assert.throws(() => {
        validateDocsStructure(inSections('api/01-a/02-b/03-c'))
    }, /api\/01-a\/02-b\/03-c: only one chapter directory is supported/)
})

// ── Navigation ───────────────────────────────────────────────────────────────

test('navigation lists the current section only, and does not leave it', () => {
    const pages = inSections('guide/01-intro', 'guide/02-next', 'api/01-client', 'api/02-server')

    const last = buildDocsNavigation(pages, 'guide/02-next', urls)
    assert.deepEqual(
        last.groups.map((group) => (group.type === 'page' ? group.item.href : group.chapter)),
        ['/', '/guide/next'],
    )
    assert.equal(last.previousPage?.href, '/')
    assert.equal(last.nextPage, null)

    const opener = buildDocsNavigation(pages, 'api/01-client', urls)
    assert.equal(opener.previousPage, null)
    assert.equal(opener.nextPage?.href, '/api/server')
})

// ── Configuration ────────────────────────────────────────────────────────────

test('a section keeps its directory, and takes its label from the key', () => {
    const config = resolveConfig(
        { title: 'T', sections: { guide: { dir: './guide', label: 'The Guide' }, api: { dir: '../shared/api' } } },
        tmpdir(),
    )
    assert.deepEqual(
        config.docsSections.map(({ key, label, dir }) => ({ key, label, dir })),
        [
            { key: 'guide', label: 'The Guide', dir: './guide' },
            { key: 'api', label: 'Api', dir: '../shared/api' },
        ],
    )
})

test('a section inside another is refused', () => {
    assert.throws(
        () =>
            resolveConfig({ title: 'T', sections: { docs: { dir: './docs' }, api: { dir: './docs/api' } } }, tmpdir()),
        /api: \.\/docs\/api is, or is inside, another section/,
    )
})

test('a section cannot have the name of a language of the docs', () => {
    withTree(
        { 'guide/en/01-a.md': '# A', 'guide/it/01-a.md': '# A', 'it/en/01-b.md': '# B', 'it/it/01-b.md': '# B' },
        (root) => {
            assert.throws(
                () => resolveConfig({ title: 'T', sections: { guide: { dir: './guide' }, it: { dir: './it' } } }, root),
                /section "it" has the name of a language/,
            )
        },
    )
})

test('a section key is a url segment', () => {
    assert.throws(
        () => resolveConfig({ title: 'T', sections: { 'My Guide': { dir: './guide' } } }, tmpdir()),
        /section key/,
    )
})

test('sections have to agree on their languages', () => {
    withTree({ 'guide/en/01-a.md': '# A', 'guide/it/01-a.md': '# A', 'api/01-b.md': '# B' }, (root) => {
        assert.throws(
            () => resolveConfig({ title: 'T', sections: { guide: { dir: './guide' }, api: { dir: './api' } } }, root),
            /sections disagree on their languages/,
        )
    })
})

// ── Redirecting urls ─────────────────────────────────────────────────────────

test('every section opener, and the first section key, has a url that redirects', () => {
    withTree(
        {
            'guide/01-intro.md': '# Intro',
            'guide/02-next.md': '# Next',
            'api/01-client.md': '# Client',
            'api/02-server.md': '# Server',
        },
        (root) => {
            const roots = [
                { dir: join(root, 'guide'), section: 'guide' },
                { dir: join(root, 'api'), section: 'api' },
            ]
            assert.deepEqual(
                findOpeningPages(roots).map((page) => page.slug),
                ['guide/intro', 'api/client', 'guide'],
            )
        },
    )
})

// ── Relative links ───────────────────────────────────────────────────────────

test('a relative link to a markdown file resolves to the page url', () => {
    withTree(
        { 'guide/01-intro.md': '', 'guide/02-setup/01-install.md': '', 'api/01-client.md': '', 'notes.md': '' },
        (root) => {
            const context = {
                roots: [
                    { dir: join(root, 'guide'), section: 'guide' },
                    { dir: join(root, 'api'), section: 'api' },
                ],
                locales: [],
                urls: () => ({ docsBase: '/docs', deploymentBase: '/repo' }),
            }
            const from = join(root, 'guide', '01-intro.md')

            assert.equal(resolveDocLink('./02-setup/01-install.md', from, context), '/repo/docs/guide/setup/install')
            assert.equal(
                resolveDocLink('02-setup/01-install.md#steps', from, context),
                '/repo/docs/guide/setup/install#steps',
            )
            assert.equal(resolveDocLink('../api/01-client.md', from, context), '/repo/docs/api/client')

            // Left as written.
            assert.equal(resolveDocLink('https://example.dev/a.md', from, context), null)
            assert.equal(resolveDocLink('/docs/guide/intro', from, context), null)
            assert.equal(resolveDocLink('#steps', from, context), null)
            assert.equal(resolveDocLink('./image.png', from, context), null)
            assert.equal(resolveDocLink('../notes.md', from, context), null)

            assert.throws(
                () => resolveDocLink('./missing.md', from, context),
                /links to \.\/missing\.md, which does not exist/,
            )
        },
    )
})

test('a link in a localised tree keeps its language', () => {
    withTree({ 'docs/it/01-intro.md': '', 'docs/it/02-guida.md': '' }, (root) => {
        const context = {
            roots: [{ dir: join(root, 'docs') }],
            locales: ['en', 'it'],
            urls: (locale?: string) => ({ docsBase: '', locale, defaultLocale: 'en' }),
        }
        assert.equal(resolveDocLink('./02-guida.md', join(root, 'docs', 'it', '01-intro.md'), context), '/it/guida')
    })
})

test('the rehype plugin rewrites the links of a tree', () => {
    withTree({ 'docs/01-intro.md': '', 'docs/02-next.md': '' }, (root) => {
        const link = (href: string) => ({ type: 'element', tagName: 'a', properties: { href }, children: [] })
        const tree = {
            type: 'root',
            children: [{ type: 'element', tagName: 'p', children: [link('./02-next.md'), link('#top')] }],
        }

        const context = { roots: [{ dir: join(root, 'docs') }], locales: [], urls: () => ({ docsBase: '' }) }
        rehypeDocLinks(context)()(tree, { path: join(root, 'docs', '01-intro.md') })

        assert.deepEqual(
            tree.children[0].children.map((node) => node.properties.href),
            ['/next', '#top'],
        )
    })
})
