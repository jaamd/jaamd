import assert from 'node:assert/strict'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { loadTailwindPlugin } from '@jaamd/site/integration.ts'
import { createSitemapFilter, findAliases, findTrespasses, getInjectedRoutes } from '../../src/docs/integration.ts'

test('opening-page discovery follows collection slugging and numeric order', () => {
    const docsDir = mkdtempSync(join(tmpdir(), 'jaad-opening-'))
    try {
        mkdirSync(join(docsDir, '02-guides'))
        writeFileSync(join(docsDir, '01-images-&-videos.md'), '# Images')
        writeFileSync(join(docsDir, '02-guides', '01-setup.md'), '# Setup')

        assert.deepEqual(findAliases([{ dir: docsDir }]), [{ locale: undefined, slug: 'images--videos' }])
    } finally {
        rmSync(docsDir, { recursive: true })
    }
})

// The opening page is whatever the collection sorts first, and the sitemap
// filter has to agree with it or it drops the wrong url.
test('a draft never counts as the opening page', () => {
    const docsDir = mkdtempSync(join(tmpdir(), 'jaad-opening-draft-'))
    try {
        writeFileSync(join(docsDir, '00-scratch.md'), '---\ndraft: true\n---\n\n# Scratch')
        writeFileSync(join(docsDir, '01-intro.md'), '# Intro')

        assert.deepEqual(findAliases([{ dir: docsDir }]), [{ locale: undefined, slug: 'intro' }])
    } finally {
        rmSync(docsDir, { recursive: true })
    }
})

test('frontmatter order moves the opening page', () => {
    const docsDir = mkdtempSync(join(tmpdir(), 'jaad-opening-order-'))
    try {
        writeFileSync(join(docsDir, '01-intro.md'), '# Intro')
        writeFileSync(join(docsDir, '02-welcome.md'), '---\norder: 0\n---\n\n# Welcome')

        assert.deepEqual(findAliases([{ dir: docsDir }]), [{ locale: undefined, slug: 'welcome' }])
    } finally {
        rmSync(docsDir, { recursive: true })
    }
})

// The collection reads frontmatter as YAML: a comment, a capitalised boolean or
// a byte order mark mean the same to it, and so they must here.
test('frontmatter is read as YAML, comments, booleans and BOM included', () => {
    const docsDir = mkdtempSync(join(tmpdir(), 'jaad-opening-yaml-'))
    try {
        writeFileSync(join(docsDir, '00-scratch.md'), '---\ndraft: True\n---\n\n# Scratch')
        writeFileSync(join(docsDir, '01-intro.md'), '# Intro')
        writeFileSync(join(docsDir, '02-welcome.md'), '\uFEFF---\norder: 0 # first\n---\n\n# Welcome')

        assert.deepEqual(findAliases([{ dir: docsDir }]), [{ locale: undefined, slug: 'welcome' }])
    } finally {
        rmSync(docsDir, { recursive: true })
    }
})

test("the sitemap omits only the opening page's named redirect", () => {
    const filter = createSitemapFilter('/docs', {
        deploymentBase: '/repo',
        aliases: [{ slug: 'images--videos' }],
    })

    assert.equal(filter('https://example.dev/repo/docs/images--videos/'), false)
    assert.equal(filter('https://example.dev/repo/docs/'), true)
    assert.equal(filter('https://example.dev/repo/docs/guide/'), true)
})

// ── One opening page per locale ──────────────────────────────────────────────

test('each locale gets its own opening page', () => {
    const docsDir = mkdtempSync(join(tmpdir(), 'jaad-opening-i18n-'))
    try {
        mkdirSync(join(docsDir, 'en'))
        mkdirSync(join(docsDir, 'it'))
        writeFileSync(join(docsDir, 'en', '01-intro.md'), '# Intro')
        writeFileSync(join(docsDir, 'en', '02-guide.md'), '# Guide')
        writeFileSync(join(docsDir, 'it', '01-introduzione.md'), '# Introduzione')

        assert.deepEqual(findAliases([{ dir: docsDir }], ['en', 'it']), [
            { locale: 'en', slug: 'intro' },
            { locale: 'it', slug: 'introduzione' },
        ])
    } finally {
        rmSync(docsDir, { recursive: true })
    }
})

test('the sitemap omits the named redirect of every locale', () => {
    const filter = createSitemapFilter(
        '',
        {
            deploymentBase: '',
            aliases: [
                { locale: 'en', slug: 'intro' },
                { locale: 'it', slug: 'introduzione' },
            ],
        },
        'en',
    )

    assert.equal(filter('https://example.dev/intro/'), false)
    assert.equal(filter('https://example.dev/it/introduzione/'), false)
    assert.equal(filter('https://example.dev/it/'), true)
    assert.equal(filter('https://example.dev/guide/'), true)
})

test('docs pages inside the base of another package are found, with their file', () => {
    const docsDir = mkdtempSync(join(tmpdir(), 'jaad-trespass-'))
    try {
        mkdirSync(join(docsDir, '02-blog'))
        writeFileSync(join(docsDir, '01-intro.md'), '# Intro')
        writeFileSync(join(docsDir, '02-blog', '01-hello.md'), '# Hello')
        writeFileSync(join(docsDir, '03-blogroll.md'), '# Blogroll')

        const reserved = [{ path: 'blog', package: '@jaamd/jaab' }]
        assert.deepEqual(findTrespasses([{ dir: docsDir }], [], 'en', reserved), [
            { file: join(docsDir, '02-blog', '01-hello.md'), path: 'blog/hello', package: '@jaamd/jaab' },
        ])
        assert.deepEqual(findTrespasses([{ dir: docsDir }], [], 'en', []), [])
    } finally {
        rmSync(docsDir, { recursive: true })
    }
})

test('a locale prefix counts toward the url a page would take', () => {
    const docsDir = mkdtempSync(join(tmpdir(), 'jaad-trespass-locale-'))
    try {
        mkdirSync(join(docsDir, 'en'))
        mkdirSync(join(docsDir, 'it'))
        writeFileSync(join(docsDir, 'en', '01-intro.md'), '# Intro')
        writeFileSync(join(docsDir, 'it', '01-intro.md'), '# Intro')
        writeFileSync(join(docsDir, 'it', '02-guide.md'), '# Guide')

        const reserved = [{ path: 'it', package: '@jaamd/jaab' }]
        const found = findTrespasses([{ dir: docsDir }], ['en', 'it'], 'en', reserved)
        assert.deepEqual(
            found.map((trespass) => {
                return trespass.path
            }),
            // The opening page is served at the locale's own root.
            ['it', 'it/guide'],
        )
    } finally {
        rmSync(docsDir, { recursive: true })
    }
})

test('technical routes stay inside the documentation mount', () => {
    assert.deepEqual(
        getInjectedRoutes('/docs').map(([pattern]) => {
            return pattern
        }),
        [
            '/docs',
            '/docs/search-index.json',
            '/docs/llms.txt',
            '/docs/llms-full.txt',
            '/docs/[...slug]',
            '/docs/[...slug].md',
        ],
    )
    assert.deepEqual(
        getInjectedRoutes('').map(([pattern]) => {
            return pattern
        }),
        ['', '/search-index.json', '/llms.txt', '/llms-full.txt', '/[...slug]', '/[...slug].md'],
    )
})

test('at the root, the site may serve the llms files in place of the docs', () => {
    assert.deepEqual(
        getInjectedRoutes('', ['it'], true, false).map(([pattern]) => {
            return pattern
        }),
        [
            '',
            '/search-index.json',
            '/[locale]/search-index.json',
            '/[locale]/llms.txt',
            '/[locale]/llms-full.txt',
            '/[...slug]',
            '/[...slug].md',
        ],
    )
    // Below the root the files are the docs' own either way.
    assert.ok(
        getInjectedRoutes('/docs', [], true, false).some(([pattern]) => {
            return pattern === '/docs/llms.txt'
        }),
    )
})

test('llms: false leaves out the files for language models, not the Markdown of each page', () => {
    assert.deepEqual(
        getInjectedRoutes('/docs', ['it'], false).map(([pattern]) => {
            return pattern
        }),
        [
            '/docs',
            '/docs/search-index.json',
            '/docs/[locale]/search-index.json',
            '/docs/[...slug]',
            '/docs/[...slug].md',
        ],
    )
})

// The rest param already absorbs "it/guide": only the fixed endpoints fan out.
test('a localised site adds one route per fixed endpoint, not per locale', () => {
    assert.deepEqual(
        getInjectedRoutes('/docs', ['it', 'fr']).map(([pattern]) => {
            return pattern
        }),
        [
            '/docs',
            '/docs/search-index.json',
            '/docs/llms.txt',
            '/docs/llms-full.txt',
            '/docs/[locale]/search-index.json',
            '/docs/[locale]/llms.txt',
            '/docs/[locale]/llms-full.txt',
            '/docs/[...slug]',
            '/docs/[...slug].md',
        ],
    )
})

test('tailwind: a plugin the site registered itself is left alone', () => {
    const registered = [[{ name: '@tailwindcss/vite:scan' }]]
    assert.deepEqual(loadTailwindPlugin('/nowhere', registered), [])
})

test('tailwind: missing packages name the install command', () => {
    const root = mkdtempSync(join(tmpdir(), 'jaad-no-tailwind-'))
    try {
        writeFileSync(join(root, 'package.json'), '{}')
        assert.throws(() => {
            return loadTailwindPlugin(root, [])
        }, /npm i -D tailwindcss @tailwindcss\/vite/)
    } finally {
        rmSync(root, { recursive: true })
    }
})
