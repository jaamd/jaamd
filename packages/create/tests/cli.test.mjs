/** The scaffolder run as a command, without installing what it writes. */

import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import {
    existsSync,
    mkdirSync,
    mkdtempSync,
    readFileSync,
    readdirSync,
    rmSync,
    symlinkSync,
    writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { after, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { localDay } from '../lib.mjs'

const CREATE_PKG = fileURLToPath(new URL('..', import.meta.url))
/** `npm create @jaamd`, which offers every template. */
const CLI = join(CREATE_PKG, 'index.mjs')
/** `npm create @jaamd/jaad`, which has JAAD's templates only. */
const JAAD_CLI = join(CREATE_PKG, '..', 'create-jaad', 'index.mjs')
const TEMPLATE_NAMES = ['docs', 'site', 'blog', 'docs-blog']
// The commands it prints name the package manager that ran it: npm, not the one running the tests.
const ENV = { ...process.env, npm_config_user_agent: 'npm/11.0.0 node/v24.0.0' }

const temporaryDirectories = new Set()

function temporaryDirectory(prefix) {
    const dir = mkdtempSync(join(tmpdir(), prefix))
    temporaryDirectories.add(dir)
    return dir
}

after(() => {
    for (const dir of temporaryDirectories) {
        rmSync(dir, { recursive: true })
    }
})

function run(command, args, cwd) {
    return execFileSync(command, args, { cwd, encoding: 'utf8', stdio: 'pipe' })
}

function snapshotFiles(directory) {
    const files = readdirSync(directory, { recursive: true, withFileTypes: true }).filter((entry) => {
        return entry.isFile()
    })
    return files
        .map((entry) => {
            const file = join(entry.parentPath, entry.name)
            return [file.slice(directory.length), readFileSync(file).toString('base64')]
        })
        .toSorted(([a], [b]) => {
            return a.localeCompare(b)
        })
}

const versionOf = (dir) => {
    return JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).version
}

/** The command's output, with the status it exited with. */
function scaffold(cli, args, cwd) {
    const result = spawnSync('node', [cli, ...args], { cwd, encoding: 'utf8', env: ENV })
    return { status: result.status, output: `${result.stdout}\n${result.stderr}` }
}

function runScaffolderHere(project, template = 'site') {
    return spawnSync('node', [CLI, '--here', '--template', template, '--title', 'Existing Project', '--no-install'], {
        cwd: project,
        encoding: 'utf8',
        env: ENV,
    })
}

test('--here changes nothing when existing configurations need a manual merge', () => {
    const project = temporaryDirectory('jaad-here-config-conflict-')
    mkdirSync(join(project, 'src'), { recursive: true })
    writeFileSync(
        join(project, 'package.json'),
        JSON.stringify({ name: 'existing-astro-project', private: true }, null, 2),
    )
    writeFileSync(
        join(project, 'astro.config.mjs'),
        'import { defineConfig } from "astro/config";\nexport default defineConfig({});\n',
    )
    writeFileSync(join(project, 'src', 'content.config.ts'), 'export const collections = {};\n')

    const before = snapshotFiles(project)
    const result = runScaffolderHere(project)
    const output = `${result.stdout}\n${result.stderr}`

    assert.equal(result.status, 1)
    assert.match(output, /cannot safely update this project/)
    assert.match(output, /astro\.config\.mjs/)
    assert.match(output, /src\/content\.config\.ts/)
    assert.match(output, /No files were changed/)
    assert.match(output, /installation#existing-astro-project/)
    assert.deepEqual(snapshotFiles(project), before)
})

test('--here refuses the site template over a configuration it cannot read', () => {
    const project = temporaryDirectory('jaad-here-site-conflict-')
    writeFileSync(join(project, 'package.json'), JSON.stringify({ name: 'configured', private: true }, null, 2))
    writeFileSync(join(project, 'jaad.config.ts'), 'export default { title: "Docs at the root" };\n')

    const before = snapshotFiles(project)
    const result = runScaffolderHere(project, 'site')
    const output = `${result.stdout}\n${result.stderr}`

    assert.equal(result.status, 1, output)
    assert.match(output, /jaad\.config\.ts already configures JAAD/)
    assert.match(output, /routeBase/)
    assert.match(output, /No files were changed/)
    assert.equal(existsSync(join(project, 'src', 'pages', 'index.astro')), false)
    assert.deepEqual(snapshotFiles(project), before)
})

// Tailwind is opt-in (`tailwind: true`): no template installs it.
test('no template depends on tailwind', () => {
    const parent = temporaryDirectory('jaad-template-deps-')
    for (const template of ['docs', 'site']) {
        const dir = join(parent, template)
        run('node', [CLI, dir, '--template', template, '--title', 'T', '--no-install'], parent)
        const { dependencies } = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
        assert.ok(!('tailwindcss' in dependencies), `${template} pulls tailwind`)
    }
})

// The scaffolder pins the version it installs by hand, and a release that
// bumps the package without it ships a project on the previous version.
test('the scaffolder installs JAAD and JAAB at its own version', () => {
    const dir = join(temporaryDirectory('jaad-version-'), 'site')
    run('node', [CLI, dir, '--template', 'docs-blog', '--title', 'T', '--no-install'], dirname(dir))
    const { dependencies } = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
    assert.equal(dependencies['@jaamd/jaad'], `^${versionOf(CREATE_PKG)}`)
    assert.equal(dependencies['@jaamd/jaab'], `^${versionOf(CREATE_PKG)}`)
})

// The templates are only files on disk: nothing fails locally when `files`
// forgets them, and everything fails once published.
test('the published scaffolder carries its templates', () => {
    const output = run('npm', ['pack', '--dry-run', '--json'], CREATE_PKG)
    const packed = JSON.parse(output)[0].files.map((entry) => {
        return entry.path
    })

    for (const file of [
        'templates/_shared/CLAUDE.md',
        'templates/_shared/tsconfig.json',
        'templates/_shared/public/favicon.svg',
        'templates/_docs/docs/01-introduction.md',
        'templates/_blog/blog/index.md',
        'templates/_blog/blog/hello-world.md',
        'templates/docs/jaad.config.ts',
        'templates/docs/AGENTS.md',
        'templates/site/AGENTS.md',
        'templates/site/jaad.config.ts',
        'templates/site/src/layouts/SiteLayout.astro',
        'templates/site/src/pages/index.astro',
        'templates/site/src/styles/site.css',
        'templates/site/src/utils/base.ts',
        'templates/blog/AGENTS.md',
        'templates/blog/jaab.config.ts',
        'templates/docs-blog/AGENTS.md',
        'templates/docs-blog/site.config.ts',
    ]) {
        assert.ok(packed.includes(file), `${file} is missing from the tarball`)
    }

    // npm drops every `.gitignore` from a tarball, so it ships renamed.
    assert.ok(packed.includes('templates/_shared/_gitignore'), 'the templates ship no gitignore')
    assert.ok(
        !packed.some((file) => {
            return file.endsWith('/.gitignore')
        }),
        'a template ships a .gitignore npm would strip',
    )
})

test('a scaffolded project ignores what it should not commit', () => {
    for (const template of TEMPLATE_NAMES) {
        const parent = temporaryDirectory(`jaad-gitignore-${template}-`)
        const result = spawnSync(
            'node',
            [CLI, 'project', '--template', template, '--title', 'Ignored', '--no-install'],
            { cwd: parent, encoding: 'utf8' },
        )
        assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`)

        const project = join(parent, 'project')
        assert.equal(existsSync(join(project, '_gitignore')), false, 'the shipped name reached the project')

        const ignored = readFileSync(join(project, '.gitignore'), 'utf8')
        for (const entry of ['dist/', '.astro/', 'node_modules/']) {
            assert.ok(ignored.includes(entry), `${entry} is not ignored`)
        }
    }
})

// Astro reads `.astro/types.d.ts` only through a tsconfig, so without one the
// editor loses `import.meta.env`, `astro:*` and the collection types.
test('a scaffolded project is set up for the editor', () => {
    for (const template of TEMPLATE_NAMES) {
        const parent = temporaryDirectory(`jaad-tsconfig-${template}-`)
        const result = spawnSync('node', [CLI, 'project', '--template', template, '--title', 'Typed', '--no-install'], {
            cwd: parent,
            encoding: 'utf8',
        })
        assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`)

        const tsconfig = JSON.parse(readFileSync(join(parent, 'project', 'tsconfig.json'), 'utf8'))
        assert.equal(tsconfig.extends, 'astro/tsconfigs/strict')
        assert.ok(tsconfig.include?.includes('.astro/types.d.ts'), 'the generated types are left out')
    }
})

// The preset prefers the .svg, so ours would outrank an icon already there.
test('--here leaves an existing favicon in charge', () => {
    const project = temporaryDirectory('jaad-favicon-')
    mkdirSync(join(project, 'public'), { recursive: true })
    writeFileSync(join(project, 'public', 'favicon.ico'), 'not really an icon')
    writeFileSync(join(project, 'package.json'), JSON.stringify({ name: 'mine' }))

    const result = runScaffolderHere(project, 'docs')
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`)

    assert.equal(
        existsSync(join(project, 'public', 'favicon.svg')),
        false,
        'the template favicon took over an existing one',
    )
})

test('the docs template is the one npm create @jaamd/jaad gives without asking', () => {
    const parent = temporaryDirectory('jaad-default-template-')
    const result = spawnSync('node', [JAAD_CLI, 'project', '--title', 'Defaulted', '--no-install'], {
        cwd: parent,
        encoding: 'utf8',
    })

    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`)

    const project = join(parent, 'project')
    const config = readFileSync(join(project, 'jaad.config.ts'), 'utf8')
    assert.doesNotMatch(config, /routeBase/, 'the site template was scaffolded')
    assert.equal(existsSync(join(project, 'src', 'layouts', 'SiteLayout.astro')), false)
    assert.equal(existsSync(join(project, 'docs', '01-introduction.md')), true)
})

test('--here recognizes canonical JAAD configurations on rerun', () => {
    const project = temporaryDirectory('jaad-here-rerun-')
    mkdirSync(join(project, 'src'), { recursive: true })
    writeFileSync(
        join(project, 'package.json'),
        JSON.stringify(
            {
                name: 'configured-project',
                private: true,
                devDependencies: {
                    astro: '^7.3.1',
                    '@jaamd/jaad': '^0.6.1',
                },
            },
            null,
            2,
        ),
    )
    writeFileSync(join(project, 'astro.config.ts'), 'export { default } from "@jaamd/jaad/site";\r\n')
    writeFileSync(join(project, 'src', 'content.config.js'), 'export { collections } from "@jaamd/jaad/content";\n')
    writeFileSync(join(project, 'jaad.config.mjs'), 'export default { title: "Already configured" };\n')

    // The site template refuses a configuration it cannot read routeBase from,
    // so recognition is exercised with the docs template.
    const result = runScaffolderHere(project, 'docs')
    const output = `${result.stdout}\n${result.stderr}`
    assert.equal(result.status, 0, output)
    assert.match(output, /kept\s+astro\.config\.ts/)
    assert.match(output, /kept\s+src\/content\.config\.js/)
    assert.match(output, /kept\s+jaad\.config\.mjs/)
    assert.equal(existsSync(join(project, 'astro.config.mjs')), false)
    assert.equal(existsSync(join(project, 'src', 'content.config.ts')), false)
    assert.equal(existsSync(join(project, 'jaad.config.ts')), false)

    const manifest = JSON.parse(readFileSync(join(project, 'package.json'), 'utf8'))
    assert.equal(manifest.dependencies, undefined)
    assert.equal(manifest.devDependencies.astro, '^7.3.1')
    assert.equal(manifest.devDependencies['@jaamd/jaad'], '^0.6.1')
})

test('--here recognizes every supported custom configuration filename', () => {
    const candidates = [
        'astro.config.ts',
        'astro.config.mts',
        'astro.config.mjs',
        'astro.config.js',
        'src/content.config.ts',
        'src/content.config.mts',
        'src/content.config.mjs',
        'src/content.config.js',
    ]

    for (const candidate of candidates) {
        const project = temporaryDirectory('jaad-here-config-name-')
        mkdirSync(dirname(join(project, candidate)), { recursive: true })
        writeFileSync(join(project, candidate), 'export default {};\n')
        const before = snapshotFiles(project)

        const result = runScaffolderHere(project)
        const output = `${result.stdout}\n${result.stderr}`
        assert.equal(result.status, 1, candidate)
        assert.match(output, new RegExp(candidate.replaceAll('.', '\\.')))
        assert.deepEqual(snapshotFiles(project), before, candidate)
    }
})

test('--here preserves an invalid package manifest when it stops', () => {
    const project = temporaryDirectory('jaad-here-invalid-manifest-')
    writeFileSync(join(project, 'package.json'), '{ not json }\n')
    const before = snapshotFiles(project)

    const result = runScaffolderHere(project)
    const output = `${result.stdout}\n${result.stderr}`
    assert.equal(result.status, 1)
    assert.match(output, /package\.json is not valid JSON/)
    assert.match(output, /No files were changed/)
    assert.deepEqual(snapshotFiles(project), before)
})

test('--here rejects multiple JAAD configuration files without writing', () => {
    const project = temporaryDirectory('jaad-here-multiple-config-')
    writeFileSync(join(project, 'jaad.config.ts'), 'export default {};\n')
    writeFileSync(join(project, 'jaad.config.js'), 'export default {};\n')
    const before = snapshotFiles(project)

    const result = runScaffolderHere(project)
    const output = `${result.stdout}\n${result.stderr}`
    assert.equal(result.status, 1)
    assert.match(output, /multiple JAAD configuration files/)
    assert.match(output, /jaad\.config\.ts, jaad\.config\.js/)
    assert.deepEqual(snapshotFiles(project), before)
})

test('non-interactive requests are complete before files are written', () => {
    const cases = [
        {
            name: 'missing answers',
            args: ['project', '--no-install'],
            message: /missing answers.*template.*title/s,
            target: 'project',
        },
        {
            name: 'unknown template',
            args: ['project', '--template', 'wiki', '--title', 'Invalid', '--no-install'],
            message: /unknown template wiki; available: docs, site, blog, docs-blog/,
            target: 'project',
        },
        {
            name: 'missing option value',
            args: ['project', '--template'],
            message: /--template needs a value/,
            target: 'project',
        },
        {
            name: 'conflicting install answers',
            args: ['project', '--template', 'docs', '--title', 'Conflict', '--install', '--no-install'],
            message: /cannot be used together/,
            target: 'project',
        },
    ]

    for (const scenario of cases) {
        const parent = temporaryDirectory(`jaad-invalid-${scenario.name}-`)
        const result = spawnSync('node', [CLI, ...scenario.args], {
            cwd: parent,
            encoding: 'utf8',
        })
        assert.equal(result.status, 1, scenario.name)
        assert.match(`${result.stdout}\n${result.stderr}`, scenario.message)
        assert.equal(existsSync(join(parent, scenario.target)), false, `${scenario.name} wrote files`)
    }
})

test('--here leaves a package.json that already has everything as it was', () => {
    const project = temporaryDirectory('jaad-here-manifest-kept-')
    const source = JSON.stringify(
        {
            name: 'ready',
            scripts: { dev: 'astro dev', build: 'astro build', preview: 'astro preview' },
            dependencies: { astro: '^7.4.2', '@jaamd/jaad': '^1.0.0' },
        },
        null,
        4,
    )
    writeFileSync(join(project, 'package.json'), source)

    const result = runScaffolderHere(project, 'docs')
    const output = `${result.stdout}\n${result.stderr}`
    assert.equal(result.status, 0, output)
    assert.match(output, /kept\s+package\.json/)
    assert.doesNotMatch(output, /updated\s+package\.json/)
    assert.equal(readFileSync(join(project, 'package.json'), 'utf8'), source)
})

test('--here adds to a package.json in its own indentation and script order', () => {
    const project = temporaryDirectory('jaad-here-manifest-updated-')
    writeFileSync(
        join(project, 'package.json'),
        JSON.stringify({ name: 'lib', scripts: { test: 'node --test', build: 'tsc' } }, null, 4) + '\n',
    )

    const result = runScaffolderHere(project, 'docs')
    const output = `${result.stdout}\n${result.stderr}`
    assert.equal(result.status, 0, output)
    assert.match(output, /updated\s+package\.json/)

    const source = readFileSync(join(project, 'package.json'), 'utf8')
    assert.match(source, /^ {4}"name": "lib",$/m, 'the indentation changed')
    assert.deepEqual(Object.keys(JSON.parse(source).scripts), ['test', 'build', 'dev', 'preview'])
})

test('--here points at Astro itself when dev runs something else', () => {
    const project = temporaryDirectory('jaad-here-dev-script-')
    writeFileSync(join(project, 'package.json'), JSON.stringify({ name: 'app', scripts: { dev: 'vite' } }))

    const result = runScaffolderHere(project, 'docs')
    const output = `${result.stdout}\n${result.stderr}`
    assert.equal(result.status, 0, output)
    assert.match(output, /npx astro dev/)
    assert.doesNotMatch(output, /npm run dev/)
})

test('a file that is a symlink is kept, even one that points nowhere yet', () => {
    const project = temporaryDirectory('jaad-symlink-')
    const outside = join(temporaryDirectory('jaad-symlink-target-'), 'planted.md')
    symlinkSync(outside, join(project, 'CLAUDE.md'))

    const result = runScaffolderHere(project, 'docs')
    const output = `${result.stdout}\n${result.stderr}`
    assert.equal(result.status, 0, output)
    assert.match(output, /kept\s+CLAUDE\.md/)
    assert.equal(existsSync(outside), false, 'the scaffolder wrote through the symlink')
})

// ── The blog templates and create-jaad ───────────────────────────────────────

test('the blog template installs JAAB alone, with a first post dated today', () => {
    const parent = temporaryDirectory('jaab-blog-')
    const { status, output } = scaffold(
        CLI,
        ['notes', '--template', 'blog', '--title', 'My "Notes"', '--no-install'],
        parent,
    )
    assert.equal(status, 0, output)
    assert.match(output, /Start writing in blog\/hello-world\.md/)

    const project = join(parent, 'notes')
    const { dependencies } = JSON.parse(readFileSync(join(project, 'package.json'), 'utf8'))
    assert.deepEqual(Object.keys(dependencies), ['astro', '@jaamd/jaab'])
    assert.equal(
        readFileSync(join(project, 'astro.config.mjs'), 'utf8'),
        'export { default } from "@jaamd/jaab/site";\n',
    )
    assert.match(readFileSync(join(project, 'jaab.config.ts'), 'utf8'), /title: "My \\"Notes\\"",/)
    assert.match(
        readFileSync(join(project, 'blog', 'hello-world.md'), 'utf8'),
        new RegExp(`^date: ${localDay(new Date())}$`, 'm'),
    )
    assert.equal(existsSync(join(project, 'docs')), false)
})

test('the docs-blog template sets up both packages from one site config', () => {
    const parent = temporaryDirectory('jaab-docs-blog-')
    const { status, output } = scaffold(
        CLI,
        ['both', '--template', 'docs-blog', '--title', 'Both', '--no-install'],
        parent,
    )
    assert.equal(status, 0, output)
    assert.match(output, /Start writing in docs\/01-introduction\.md and blog\/hello-world\.md/)

    const project = join(parent, 'both')
    const astroConfig = readFileSync(join(project, 'astro.config.mjs'), 'utf8')
    assert.match(astroConfig, /jaad\(\{ \.\.\.site, routeBase: "\/" \}\)/)
    assert.match(astroConfig, /jaab\(\{ \.\.\.site, routeBase: "\/blog" \}\)/)
    assert.match(readFileSync(join(project, 'site.config.ts'), 'utf8'), /defineSiteConfig\(\{\n {2}title: "Both",/)
    assert.match(readFileSync(join(project, 'src', 'content.config.ts'), 'utf8'), /\{ \.\.\.docs, \.\.\.blog \}/)
    assert.equal(existsSync(join(project, 'jaad.config.ts')), false)
    assert.equal(existsSync(join(project, 'jaab.config.ts')), false)
})

test('--here recognizes its own docs-blog configurations on rerun', () => {
    const parent = temporaryDirectory('jaab-docs-blog-rerun-')
    run('node', [CLI, 'both', '--template', 'docs-blog', '--title', 'Both', '--no-install'], parent)
    const project = join(parent, 'both')
    const before = snapshotFiles(project)

    const result = runScaffolderHere(project, 'docs-blog')
    const output = `${result.stdout}\n${result.stderr}`
    assert.equal(result.status, 0, output)
    assert.match(output, /kept\s+astro\.config\.mjs/)
    assert.match(output, /kept\s+site\.config\.ts/)
    assert.match(output, /found\s+1 markdown file\(s\) in docs\//)
    assert.match(output, /found\s+2 markdown file\(s\) in blog\//)
    assert.deepEqual(snapshotFiles(project), before)
})

// Its astro.config.mjs is JAAD's, and the scaffolder never rewrites a file.
test('--here will not add a blog to a JAAD project, and says where to read how', () => {
    const parent = temporaryDirectory('jaab-onto-jaad-')
    run('node', [CLI, 'docs', '--template', 'docs', '--title', 'Docs', '--no-install'], parent)
    const project = join(parent, 'docs')
    const before = snapshotFiles(project)

    const result = runScaffolderHere(project, 'docs-blog')
    const output = `${result.stdout}\n${result.stderr}`
    assert.equal(result.status, 1, output)
    assert.match(output, /astro\.config\.mjs sets up the docs template, not docs-blog/)
    assert.match(output, /Integrate JAAD and JAAB manually: \S+\/jaab\/getting-started\/installation#docs-and-a-blog/)
    assert.deepEqual(snapshotFiles(project), before)
})

// JAAB serves its index at /, and stops the build over a page of the project there.
test('--here will not put a blog at the root over a page of the project', () => {
    const project = temporaryDirectory('jaab-here-root-page-')
    writeFileSync(join(project, 'package.json'), JSON.stringify({ name: 'landing', private: true }, null, 2))
    mkdirSync(join(project, 'src', 'pages'), { recursive: true })
    writeFileSync(join(project, 'src', 'pages', 'index.astro'), '<h1>Landing</h1>\n')
    const before = snapshotFiles(project)

    const result = runScaffolderHere(project, 'blog')
    const output = `${result.stdout}\n${result.stderr}`
    assert.equal(result.status, 1, output)
    assert.match(output, /src\/pages\/index\.astro takes \/, and the blog template serves the blog index at \//)
    assert.match(output, /docs-blog template for a blog at \/blog/)
    assert.match(output, /No files were changed/)
    assert.deepEqual(snapshotFiles(project), before)
})

test('--here keeps the posts a blog already has', () => {
    const project = temporaryDirectory('jaab-here-posts-')
    mkdirSync(join(project, 'blog'))
    writeFileSync(join(project, 'blog', 'first.md'), '---\ndate: 2026-01-01\n---\n\nMine.\n')

    const result = runScaffolderHere(project, 'blog')
    const output = `${result.stdout}\n${result.stderr}`
    assert.equal(result.status, 0, output)
    assert.match(output, /found\s+1 markdown file\(s\) in blog\//)
    assert.match(output, /Start writing in blog\//)
    assert.equal(existsSync(join(project, 'blog', 'hello-world.md')), false)
    assert.equal(existsSync(join(project, 'blog', 'index.md')), false)
})

test('create-jaad offers the templates it always had', () => {
    const parent = temporaryDirectory('jaamd-alias-')

    const refused = scaffold(JAAD_CLI, ['refused', '--template', 'blog', '--title', 'No', '--no-install'], parent)
    assert.equal(refused.status, 1)
    assert.match(
        refused.output,
        /^create-jaad: blog is not a template of @jaamd\/jaad; available: docs, site\. npm create @jaamd offers every template\./m,
    )
    assert.equal(existsSync(join(parent, 'refused')), false)

    const help = scaffold(JAAD_CLI, ['--help'], parent)
    assert.match(help.output, /^Usage: npm create @jaamd\/jaad@latest/)
    assert.match(help.output, /docs +docs at \/ \(default\)\n +site +landing page at \/, docs at \/docs\n/)
})
