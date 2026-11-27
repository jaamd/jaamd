import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test, type TestContext } from 'node:test'
import { resolveStylesheets } from '@jaamd/site/config.ts'
import { uiString } from '@jaamd/site/ui.ts'
import { ITALIAN_UI } from '@jaamd/site/ui/it.ts'
import { fontProviders } from 'astro/config'
import { defineJaadConfig, resolveConfig } from '../../src/config.ts'

// Resolved outside a repository, so nothing is inferred and the defaults show.
const bare = (over = {}) => {
    return resolveConfig({ title: 'T', ...over }, '/')
}

test('title is the only thing you must supply', () => {
    const config = bare()
    assert.equal(config.title, 'T')
    assert.equal(config.docs.dir, './docs')
    assert.equal(config.docs.base, '')
    assert.equal(config.lang, 'en')
    assert.deepEqual(config.nav, [])
    assert.deepEqual(config.social, {})
})

test('the default author must be in authors', () => {
    assert.throws(() => {
        return bare({ author: 'ada' })
    }, /jaad: author is "ada", which authors does not list/)
    assert.equal(bare({ author: 'ada', authors: { ada: { name: 'Ada' } } }).docs.author, 'ada')
})

test('lang has to be a language tag', () => {
    assert.equal(bare({ lang: 'pt-BR' }).lang, 'pt-BR')
    assert.throws(() => {
        return bare({ lang: 'en_US' })
    }, /lang must be a language tag/)
})

test('a public url is root-relative or http(s), never protocol-relative', () => {
    assert.equal(bare({ logo: '/logo.svg' }).logo, '/logo.svg')
    assert.throws(() => {
        return bare({ logo: '//evil.example/logo.svg' })
    }, /logo must be a public url/)
})

test("astro passthrough keeps Astro's option types", () => {
    const config = defineJaadConfig({
        title: 'T',
        astro: { output: 'static', redirects: { '/old': '/new' } },
    })

    assert.equal(config.astro?.output, 'static')

    defineJaadConfig({
        title: 'T',
        astro: {
            // @ts-expect-error Unknown Astro options must not pass type checking.
            notAnAstroOption: true,
        },
    })
})

test('a missing title is rejected rather than defaulted', () => {
    assert.throws(() => {
        return resolveConfig({} as never, '/')
    })
})

test('the appearance follows the reader unless it is pinned', () => {
    assert.equal(bare().appearance, 'auto')
    assert.equal(bare({ appearance: 'dark' }).appearance, 'dark')
})

test('an appearance that is not a mode lists the ones that are', () => {
    assert.throws(
        () => {
            return bare({ appearance: 'system' })
        },
        (error: Error) => {
            assert.match(error.message, /\n {2}appearance: /)
            assert.match(error.message, /auto, light, dark/)
            return true
        },
    )
})

// ── What the terminal says when the config is wrong ──────────────────────────

test('a misspelt option is an error naming the real one', () => {
    assert.throws(
        () => {
            return bare({ routebase: '/manual' })
        },
        (error: Error) => {
            assert.match(error.message, /unknown option routebase/)
            assert.match(error.message, /did you mean routeBase\?/)
            return true
        },
    )
})

test('an option that does not exist lists the ones that do', () => {
    assert.throws(() => {
        return bare({ sidebar: [] })
    }, /unknown option sidebar[\s\S]*available: title/)
})

test('every problem is reported at once, one per line', () => {
    assert.throws(
        () => {
            return resolveConfig({ title: 1, logo: './x.svg' } as never, '/')
        },
        (error: Error) => {
            assert.match(error.message, /^jaad: invalid configuration\n/)
            assert.match(error.message, /\n {2}title: /)
            assert.match(error.message, /\n {2}logo: /)
            return true
        },
    )
})

test('an explicit edit link is used verbatim', () => {
    assert.equal(
        bare({ editLink: 'https://git.example.dev/r/edit/main/docs/:path' }).docs.editBase,
        'https://git.example.dev/r/edit/main/docs/:path',
    )
})

test('edit link and repository degrade to null outside a repository', () => {
    const config = bare()
    assert.equal(config.docs.editBase, null)
    assert.equal(config.repoUrl, null)
})

test('editLink false disables it even inside a repository', () => {
    assert.equal(resolveConfig({ title: 'T', editLink: false }).docs.editBase, null)
})

test('the shorthand and full theme forms both parse', () => {
    assert.equal(bare({ theme: 'dracula' }).theme, 'dracula')
    assert.deepEqual(bare({ theme: { light: 'a', dark: 'b' } }).theme, {
        light: 'a',
        dark: 'b',
    })
})

test('an unknown theme is a build error, not a silent fallback', () => {
    assert.throws(
        () => {
            return resolveConfig({ title: 'T', theme: 'solarized' }, '/')
        },
        (e: Error) => {
            return /unknown theme/.test(String(e)) && /dracula/.test(String(e))
        },
    )
})

test('social accepts a bare url or a full entry', () => {
    const { social } = bare({
        social: {
            github: 'https://github.com/o/r',
            forum: { href: 'https://f.dev', label: 'Forum', svg: '<svg/>' },
        },
    })
    assert.equal(social.github, 'https://github.com/o/r')
    assert.deepEqual(social.forum, {
        href: 'https://f.dev',
        label: 'Forum',
        svg: '<svg/>',
    })
})

// ── The footer, which is one free line and not a shape ───────────────────────

test('an unset footer stays unset, so the component supplies the credit', () => {
    assert.equal(bare().footer, undefined)
})

test('a footer line is taken verbatim, placeholder and all', () => {
    assert.equal(bare({ footer: '© 2026 Me' }).footer, '© 2026 Me')
    assert.equal(bare({ footer: '© 2026 Me · :credit' }).footer, '© 2026 Me · :credit')
})

// The footer component reads `false`: the parse must keep it.
test('footer false survives the parse, so the component can act on it', () => {
    assert.equal(bare({ footer: false }).footer, false)
})

// A footer written as an object is refused, and the error says how to write it.
test('a footer object is refused with its replacement spelled out', () => {
    assert.throws(
        () => {
            return bare({ footer: { message: 'MIT', copyright: '© 2026' } })
        },
        (error: Error) => {
            assert.match(error.message, /\n {2}footer: /)
            assert.match(error.message, /single string/)
            assert.match(error.message, /:credit/)
            return true
        },
    )
})

// An integration can reference itself, so it must stay out of the serialised config.
test("astro's own options never reach the resolved config", () => {
    const integration = { name: 'x', hooks: {} } as Record<string, unknown>
    integration.self = integration

    const config = bare({
        site: 'https://a.dev',
        base: '/x',
        astro: { integrations: [integration] },
    })

    assert.deepEqual(
        Object.keys(config).filter((k) => {
            return ['site', 'base', 'astro'].includes(k)
        }),
        [],
    )
    assert.doesNotThrow(() => {
        return JSON.stringify(config)
    })
})

test('fonts set in astro.fonts reach the resolved config by css variable', () => {
    const config = bare({
        astro: {
            fonts: [
                {
                    provider: fontProviders.local(),
                    name: 'Mono',
                    cssVariable: '--font-mono-x',
                    options: { variants: [] },
                },
            ],
        },
    })
    assert.deepEqual(config.fonts, ['--font-mono-x'])
    assert.deepEqual(bare().fonts, [])
})

// ── The mount point, which every internal link is built from ─────────────────

test('the mount point gets one leading slash and no trailing one', () => {
    const at = (routeBase: string) => {
        return bare({ routeBase }).docs.base
    }
    assert.equal(at('/docs'), '/docs')
    assert.equal(at('docs'), '/docs', 'a missing slash made every link relative')
    assert.equal(at('/docs/'), '/docs')
    assert.equal(at('/manual/guide'), '/manual/guide')
})

test('the root mount point is empty, so links stay single-slashed', () => {
    assert.equal(bare({ routeBase: '/' }).docs.base, '')
})

test('a logo has to be a public url, not a source path', () => {
    assert.equal(bare({ logo: '/logo.svg' }).logo, '/logo.svg')
    assert.equal(bare({ logo: 'https://cdn.dev/l.svg' }).logo, 'https://cdn.dev/l.svg')
    assert.throws(() => {
        return bare({ logo: './src/logo.svg' })
    }, /public url/)
})

test('the site name leads to the site root unless told otherwise', () => {
    assert.equal(bare({}).homeLink, '/')
    assert.equal(bare({ homeLink: 'https://example.dev' }).homeLink, 'https://example.dev')
})

test('a social image is inferred only when the public asset exists', (t) => {
    const cwd = mkdtempSync(join(tmpdir(), 'jaad-config-'))
    t.after(() => {
        rmSync(cwd, { recursive: true })
    })

    assert.equal(resolveConfig({ title: 'T' }, cwd).ogImage, false)

    mkdirSync(join(cwd, 'public'))
    writeFileSync(join(cwd, 'public', 'og-image.webp'), 'image')
    assert.equal(resolveConfig({ title: 'T' }, cwd).ogImage, '/og-image.webp')
    assert.equal(resolveConfig({ title: 'T', ogImage: false }, cwd).ogImage, false)
})

test("public assets and jaamd.css are found in Astro's directories, not below the working one", (t) => {
    const root = mkdtempSync(join(tmpdir(), 'jaad-paths-'))
    t.after(() => {
        rmSync(root, { recursive: true })
    })
    mkdirSync(join(root, 'static'))
    mkdirSync(join(root, 'source'))
    writeFileSync(join(root, 'static', 'favicon.svg'), '<svg/>')
    writeFileSync(join(root, 'source', 'jaamd.css'), '')

    const paths = { root, publicDir: join(root, 'static'), srcDir: join(root, 'source') }
    const config = resolveConfig({ title: 'T' }, paths)
    assert.equal(config.favicon, '/favicon.svg')
    assert.equal(resolveStylesheets(config, paths).user, join(root, 'source', 'jaamd.css'))
})

test('jaad.css is still read, and is an error next to jaamd.css', (t) => {
    const root = mkdtempSync(join(tmpdir(), 'jaad-stylesheet-'))
    t.after(() => {
        rmSync(root, { recursive: true })
    })
    mkdirSync(join(root, 'src'))
    const config = resolveConfig({ title: 'T' }, root)

    assert.equal(resolveStylesheets(config, root).user, null)

    writeFileSync(join(root, 'src', 'jaad.css'), '')
    assert.equal(resolveStylesheets(config, root).user, join(root, 'src', 'jaad.css'))

    writeFileSync(join(root, 'src', 'jaamd.css'), '')
    assert.throws(() => {
        return resolveStylesheets(config, root)
    }, /jaamd: src\/jaamd\.css and src\/jaad\.css both exist[\s\S]*Move the rules of src\/jaad\.css into src\/jaamd\.css/)
})

test('a misspelt key inside an option is an error, not a silent no-op', () => {
    assert.throws(() => {
        return bare({ head: [{ tag: 'meta', attributes: { name: 'x' } }] })
    }, /head\.0/)
    assert.throws(() => {
        return bare({ nav: [{ label: 'Blog', url: '/blog' }] })
    }, /nav\.0/)
    assert.throws(() => {
        return bare({ theme: { light: 'a', drak: 'b' } })
    }, /theme/)
    assert.throws(() => {
        return bare({ sections: { api: { dir: './api', lable: 'API' } } })
    }, /sections\.api/)
})

test('ui overrides name strings JAAD has, in a locale code', () => {
    assert.equal(bare({ ui: { it: { 'search.placeholder': 'Cerca' } } }).ui.it['search.placeholder'], 'Cerca')
    assert.throws(() => {
        return bare({ ui: { it: { 'search.placeholer': 'Cerca' } } })
    }, /ui\.it/)
    assert.throws(() => {
        return bare({ ui: { italiano: {} } })
    }, /ui\.italiano/)
})

test('a link is a path or an http(s), mailto or tel URL', () => {
    assert.deepEqual(
        bare({ nav: [{ label: 'Mail', href: 'mailto:me@example.dev' }] }).nav[0].href,
        'mailto:me@example.dev',
    )
    assert.throws(() => {
        return bare({ nav: [{ label: 'x', href: 'javascript:alert(1)' }] })
    }, /nav link must be a path/)
    assert.throws(() => {
        return bare({ social: { x: 'javascript:alert(1)' } })
    }, /social link must be a path/)
    assert.throws(() => {
        return bare({ homeLink: 'data:text/html,x' })
    }, /homeLink must be a path/)
})

test('an explicit social image has to be a public url', () => {
    assert.equal(bare({ ogImage: '/social.png' }).ogImage, '/social.png')
    assert.equal(bare({ ogImage: 'https://cdn.example.dev/social.png' }).ogImage, 'https://cdn.example.dev/social.png')
    assert.throws(() => {
        return bare({ ogImage: './src/social.png' })
    }, /public url/)
})

// ── Locales ──────────────────────────────────────────────────────────────────

const docsTree = (t: TestContext, entries: string[]) => {
    const cwd = mkdtempSync(join(tmpdir(), 'jaad-config-locales-'))
    t.after(() => {
        rmSync(cwd, { recursive: true })
    })
    for (const entry of entries) {
        mkdirSync(join(cwd, 'docs', entry, '..'), { recursive: true })
        writeFileSync(join(cwd, 'docs', entry), '# Page')
    }
    return cwd
}

test('locale directories reach the resolved config', (t) => {
    const cwd = docsTree(t, ['en/01-a.md', 'it/01-a.md'])
    const config = resolveConfig({ title: 'T' }, cwd)

    assert.deepEqual(
        config.locales.map((locale) => {
            return locale.code
        }),
        ['en', 'it'],
    )
    assert.equal(config.defaultLocale, 'en')
})

test('locales: false leaves the directories as chapters', (t) => {
    const cwd = docsTree(t, ['en/01-a.md', 'it/01-a.md'])
    const config = resolveConfig({ title: 'T', locales: false }, cwd)

    assert.deepEqual(config.locales, [])
    assert.equal(config.defaultLocale, 'en')
})

test('an explicit list is taken over what detection would find', (t) => {
    const cwd = docsTree(t, ['en/01-a.md', 'it/01-a.md', 'fr/01-a.md'])
    const config = resolveConfig({ title: 'T', locales: ['en', 'it'] }, cwd)

    assert.deepEqual(
        config.locales.map((locale) => {
            return locale.code
        }),
        ['en', 'it'],
    )
})

test('two empty locale directories leave the docs unlocalised', (t) => {
    const cwd = mkdtempSync(join(tmpdir(), 'jaad-config-locales-'))
    t.after(() => {
        rmSync(cwd, { recursive: true })
    })
    mkdirSync(join(cwd, 'docs', 'en'), { recursive: true })
    mkdirSync(join(cwd, 'docs', 'it'), { recursive: true })

    assert.deepEqual(resolveConfig({ title: 'T' }, cwd).locales, [])
})

// A pinned list skips detection, which is what guards against a missing docsDir.
test('a pinned list does not crash when there is no docs directory', () => {
    assert.doesNotThrow(() => {
        return bare({ locales: ['en'] })
    })
    assert.deepEqual(bare({ locales: ['en'] }).locales, [])
})

test('a locale code the config pins has to be a real one', () => {
    assert.throws(() => {
        return bare({ locales: ['nope'] })
    }, /not a locale code/)
})

test('unlocalised docs use the lang override as their default locale', () => {
    const config = resolveConfig(
        {
            title: 'T',
            lang: 'it',
        },
        '/',
    )

    assert.deepEqual(config.locales, [])
    assert.equal(config.defaultLocale, 'it')
    assert.equal(uiString(config.ui, config.defaultLocale, 'page.copy'), ITALIAN_UI['page.copy'])
})
