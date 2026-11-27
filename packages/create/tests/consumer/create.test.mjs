import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, writeFileSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { after, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { walk } from '../../../../tests/dist.mjs'
import {
    cleanupTemporaryDirectories,
    jaamdOverride,
    packPackage,
    run,
    temporaryDirectory,
} from '../../../jaad/tests/consumer/helpers.mjs'

const PACKAGES = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const CREATE_PKG = join(PACKAGES, 'create')
const CLI = join(CREATE_PKG, 'index.mjs')
const PRODUCTS = {
    '@jaamd/jaad': join(PACKAGES, 'jaad'),
    '@jaamd/jaab': join(PACKAGES, 'jaab'),
}

const tarballs = {}
const pack = (name) => {
    tarballs[name] ??= packPackage(PRODUCTS[name])
    return tarballs[name]
}

/** The generated manifest asks npm for the published packages; point it at ours. */
function useLocalPackages(project) {
    const file = join(project, 'package.json')
    const manifest = JSON.parse(readFileSync(file, 'utf8'))
    for (const name of Object.keys(PRODUCTS)) {
        if (name in manifest.dependencies) {
            manifest.dependencies[name] = pack(name)
        }
    }
    manifest.overrides = jaamdOverride()
    writeFileSync(file, JSON.stringify(manifest, null, 2))
}

/** Installs and builds the project, and lists what it built. */
function installAndBuild(project) {
    useLocalPackages(project)
    run('npm', ['install', '--no-audit', '--no-fund'], project)
    run('npx', ['astro', 'build'], project)

    const dist = join(project, 'dist')
    return walk(dist).map((file) => {
        return file.slice(dist.length)
    })
}

/** The guides an `AGENTS.md` cites in `node_modules`, as [package, path in it]. */
function citedGuides(agents) {
    return [...agents.matchAll(/`node_modules\/(@jaamd\/jaa[db])\/(docs\/[^`]+\.md)`/g)].map((match) => {
        return [match[1], match[2]]
    })
}

after(cleanupTemporaryDirectories)

test('the scaffolder produces a project that builds', { timeout: 600_000 }, () => {
    const parent = temporaryDirectory('jaad-create-')

    const output = run(
        'node',
        [CLI, 'docs-site', '--template', 'docs', '--title', 'Scaffolded', '--no-install'],
        parent,
    )
    assert.match(output, /cd docs-site/)
    assert.match(output, /npm install/)
    assert.match(output, /npm run dev/)
    assert.match(output, /Start writing in docs\/01-introduction\.md/)

    const project = join(parent, 'docs-site')
    const built = installAndBuild(project)
    assert.ok(built.includes('/index.html'), 'no docs index')
    assert.ok(built.includes('/introduction/index.html'), 'no compatibility redirect for the sample page')
    const agents = readFileSync(join(project, 'AGENTS.md'), 'utf8')
    const guides = citedGuides(agents)
    assert.ok(guides.length > 0, 'AGENTS.md lists no guide in node_modules')
    assert.deepEqual(
        guides.filter(([name, guide]) => {
            return !existsSync(join(project, 'node_modules', name, guide))
        }),
        [],
        'AGENTS.md cites a guide the package does not install',
    )
    assert.deepEqual(
        readdirSync(join(PRODUCTS['@jaamd/jaad'], 'docs'), { recursive: true })
            .filter((file) => {
                return file.endsWith('.md')
            })
            .filter((file) => {
                return !existsSync(join(project, 'node_modules', '@jaamd', 'jaad', 'docs', file))
            }),
        [],
        'a documentation page is missing from the tarball',
    )
    assert.match(agents, /astro dev --background/)
    assert.match(
        readFileSync(join(project, 'CLAUDE.md'), 'utf8'),
        /AGENTS\.md/,
        'CLAUDE.md does not defer to AGENTS.md',
    )
    assert.ok(
        !built.some((file) => {
            return /agents|claude/i.test(file)
        }),
        'an agent guide was published as a page',
    )

    const home = readFileSync(join(project, 'dist', 'index.html'), 'utf8')
    assert.match(home, /<title>Scaffolded<\/title>/, 'title missing')
    assert.doesNotMatch(home, /rel="canonical"/)
    assert.doesNotMatch(home, /(?:property|name)="(?:og:url|twitter:url)"/)
    assert.doesNotMatch(home, /(?:property|name)="(?:og:image|twitter:image)"/)
    assert.doesNotMatch(home, /https?:\/\/localhost/)

    writeFileSync(join(project, 'docs', '02-introduction.md'), '# Duplicate introduction\n')
    const invalid = spawnSync('npx', ['astro', 'build'], {
        cwd: project,
        encoding: 'utf8',
    })
    assert.equal(invalid.status, 1, 'an ambiguous docs tree still built')
    assert.match(
        `${invalid.stdout}\n${invalid.stderr}`,
        /jaad: invalid documentation structure[\s\S]*01-introduction, 02-introduction all resolve to \/introduction/,
    )
})

test('the site template keeps the landing page separate from the docs', { timeout: 600_000 }, () => {
    const parent = temporaryDirectory('jaad-create-site-')

    run('node', [CLI, 'product-site', '--template', 'site', '--title', 'Product', '--no-install'], parent)

    const project = join(parent, 'product-site')
    const built = installAndBuild(project)
    assert.ok(built.includes('/index.html'), 'no landing page')
    assert.ok(built.includes('/docs/index.html'), 'no docs index')
    assert.ok(built.includes('/docs/introduction/index.html'), 'no compatibility redirect for the sample page')
    const landing = readFileSync(join(project, 'dist', 'index.html'), 'utf8')
    assert.match(
        landing,
        /href="\/docs\/"[^>]*>\s*Read the documentation/,
        'the landing page does not link to the docs',
    )
    assert.doesNotMatch(landing, /site-chrome|site-theme-toggle/)
    const landingSource = readFileSync(join(project, 'src', 'pages', 'index.astro'), 'utf8')
    assert.match(landingSource, /layouts\/SiteLayout\.astro/)
    assert.doesNotMatch(landingSource, /@jaamd\/jaad\/layouts/)
    assert.ok(
        existsSync(join(project, 'src', 'layouts', 'SiteLayout.astro')),
        'the site template did not create a local layout',
    )
    const siteLayout = readFileSync(join(project, 'src', 'layouts', 'SiteLayout.astro'), 'utf8')
    assert.doesNotMatch(siteLayout, /@jaamd\/jaad/)
    assert.match(siteLayout, /import "\.\.\/styles\/site\.css"/)
    assert.match(siteLayout, /<footer class="landing-chrome landing-footer">/)

    const siteCss = readFileSync(join(project, 'src', 'styles', 'site.css'), 'utf8')
    assert.match(siteCss, /--landing-content-width: 56rem/)
    assert.match(siteCss, /--color-background: #faf8f5/)
    assert.match(siteCss, /--color-background: #0d1117/)

    assert.match(readFileSync(join(project, 'jaad.config.ts'), 'utf8'), /routeBase: "\/docs"/)

    // The favicon is picked up from `public/`, not named in the config.
    assert.ok(built.includes('/favicon.svg'), 'the favicon was not published')
    assert.match(landing, /rel="icon" href="\/favicon\.svg"/)
    const docsPage = readFileSync(join(project, 'dist', 'docs', 'index.html'), 'utf8')
    assert.match(docsPage, /rel="icon" href="\/favicon\.svg"/)
})

/**
 * The reason `--here` exists: a repository that already has markdown, a
 * manifest, and files that are none of the scaffolder's business.
 */
test('--here adds jaad to an existing repository without taking it over', { timeout: 600_000 }, () => {
    const project = temporaryDirectory('jaad-here-')

    mkdirSync(join(project, 'docs', '02-guides'), { recursive: true })
    writeFileSync(
        join(project, 'package.json'),
        JSON.stringify({
            name: '@acme/my-library',
            version: '2.3.0',
            scripts: { test: 'node --test' },
            dependencies: { 'left-pad': '^1.3.0' },
        }),
    )
    writeFileSync(join(project, 'docs', '01-overview.md'), '# Overview\n\nMine.\n')
    writeFileSync(join(project, 'docs', '02-guides', '01-setup.md'), '# Setup\n\nAlso mine.\n')
    mkdirSync(join(project, 'src', 'pages'), { recursive: true })
    writeFileSync(join(project, 'src', 'pages', 'index.astro'), '<h1 data-existing>Existing landing</h1>\n')

    const output = run('node', [CLI, '--here', '--template', 'site', '--title', 'My Library', '--no-install'], project)
    assert.match(output, /found\s+2 markdown/, 'existing pages were not noticed')
    assert.doesNotMatch(output, /\bcd\s/)
    assert.match(output, /npm install/)
    assert.match(output, /npm run dev/)
    assert.match(output, /Start writing in docs\//)

    const manifest = JSON.parse(readFileSync(join(project, 'package.json'), 'utf8'))
    assert.equal(manifest.name, '@acme/my-library', 'the manifest was replaced')
    assert.equal(manifest.version, '2.3.0')
    assert.equal(manifest.scripts.test, 'node --test', 'a script was lost')
    assert.equal(manifest.dependencies['left-pad'], '^1.3.0', 'a dep was lost')
    // Adding this to someone's library changes how node reads every file in it.
    assert.equal(manifest.type, undefined, 'type: module was forced on')
    assert.equal(
        existsSync(join(project, 'src', 'layouts', 'SiteLayout.astro')),
        false,
        'an unused site layout was added beside an existing landing page',
    )

    const built = installAndBuild(project)
    assert.match(
        readFileSync(join(project, 'dist', 'index.html'), 'utf8'),
        /data-existing/,
        'the existing landing page was replaced',
    )
    assert.ok(built.includes('/docs/guides/setup/index.html'), 'existing chapter missing')
    assert.ok(!built.includes('/introduction/index.html'), 'a sample page was written over an existing docs folder')
})

test('every guide the agent files cite is a page of the docs', () => {
    for (const template of ['docs', 'site', 'blog', 'docs-blog']) {
        const agents = readFileSync(join(CREATE_PKG, 'templates', template, 'AGENTS.md'), 'utf8')
        const missing = citedGuides(agents).filter(([name, guide]) => {
            return !existsSync(join(PRODUCTS[name], guide))
        })
        assert.deepEqual(missing, [], `templates/${template}/AGENTS.md`)
    }
})

test('the blog template builds a blog at the root', { timeout: 600_000 }, () => {
    const parent = temporaryDirectory('jaab-create-')
    run('node', [CLI, 'notes', '--template', 'blog', '--title', 'Notes', '--no-install'], parent)

    const project = join(parent, 'notes')
    const built = installAndBuild(project)
    assert.ok(built.includes('/index.html'), 'no blog index')
    assert.ok(built.includes('/hello-world/index.html'), 'no first post')
    // Without `site` there are no absolute URLs, so no feed.
    assert.ok(!built.includes('/rss.xml'), 'a feed was written without site')

    const index = readFileSync(join(project, 'dist', 'index.html'), 'utf8')
    assert.match(index, /<title>Blog \| Notes<\/title>/)
    assert.match(index, /<code>blog\/index\.md<\/code>, the text above the list of posts/)
    assert.match(index, /href="\/hello-world\/"[^>]*>Hello, world</)
    assert.match(readFileSync(join(project, 'dist', 'hello-world', 'index.html'), 'utf8'), /The first post\./)
})

test('the docs-blog template builds the docs at the root and the blog at /blog', { timeout: 600_000 }, () => {
    const parent = temporaryDirectory('jaab-create-both-')
    run('node', [CLI, 'both', '--template', 'docs-blog', '--title', 'Both', '--no-install'], parent)

    const project = join(parent, 'both')
    const built = installAndBuild(project)
    for (const page of ['/index.html', '/blog/index.html', '/blog/hello-world/index.html']) {
        assert.ok(built.includes(page), `${page} was not built`)
    }

    const docs = readFileSync(join(project, 'dist', 'index.html'), 'utf8')
    assert.match(docs, /Write markdown in <code>docs\/<\/code>/, 'the docs do not open at the root')
    assert.match(docs, /href="\/blog\/"[^>]*>Blog</, 'the nav does not lead to the blog')
    assert.match(readFileSync(join(project, 'dist', 'blog', 'index.html'), 'utf8'), /href="\/blog\/hello-world\/"/)
})

// The alias is a manifest and an import: only installed does it show whether
// the dependency on @jaamd/create resolves.
test('create-jaad scaffolds from its packed tarball', { timeout: 600_000 }, () => {
    const tools = temporaryDirectory('jaamd-alias-')
    writeFileSync(
        join(tools, 'package.json'),
        JSON.stringify({
            name: 'tools',
            private: true,
            dependencies: {
                '@jaamd/create-jaad': `file:${packPackage(join(PACKAGES, 'create-jaad'))}`,
            },
            overrides: { '@jaamd/create': `file:${packPackage(CREATE_PKG)}` },
        }),
    )
    run('npm', ['install', '--no-audit', '--no-fund'], tools)

    run('npx', ['create-jaad', 'docs', '--title', 'Docs', '--no-install'], tools)
    assert.ok(existsSync(join(tools, 'docs', 'jaad.config.ts')), 'create-jaad did not write a docs site')
})
