#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { styleText } from 'node:util'
import * as p from '@clack/prompts'
import {
    DEFAULT_TEMPLATE,
    HELP,
    completeManifest,
    devCommand,
    fail,
    formatManifest,
    missingAnswers,
    normaliseDir,
    packageManager,
    parseArgs,
    quoteArg,
    titleFrom,
} from './lib.mjs'

// Every package is released at one version: this one's is JAAD's.
const JAAD = `^${JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version}`
const ASTRO = '^7.4.2'
// The names Astro itself looks for.
const ASTRO_CONFIG_NAMES = ['astro.config.ts', 'astro.config.mts', 'astro.config.mjs', 'astro.config.js']
const CONTENT_CONFIG_NAMES = [
    'src/content.config.ts',
    'src/content.config.mts',
    'src/content.config.mjs',
    'src/content.config.js',
]
const JAAD_CONFIG_NAMES = ['jaad.config.ts', 'jaad.config.mjs', 'jaad.config.js']
const ASTRO_CONFIG = 'export { default } from "@jaamd/jaad/site";\n'
const CONTENT_CONFIG = 'export { collections } from "@jaamd/jaad/content";\n'
const MANUAL_SETUP_URL = 'https://docs.jaamd.org/jaad/getting-started/installation#existing-astro-project'
const INDEX_PAGE_NAMES = ['index.astro', 'index.md', 'index.mdx', 'index.html', 'index.js', 'index.ts']
const FAVICON_NAMES = ['favicon.svg', 'favicon.ico', 'favicon.png']
const DEFAULT_DIR = 'my-docs'

function markdownUnder(dir) {
    if (!existsSync(dir)) return 0
    return readdirSync(dir, { withFileTypes: true }).reduce(
        (count, entry) =>
            count + (entry.isDirectory() ? markdownUnder(join(dir, entry.name)) : entry.name.endsWith('.md') ? 1 : 0),
        0,
    )
}

/** Never overwrites: an existing file is the user's, not ours. `wx` also
 *  refuses a symlink, even one that points nowhere yet. */
function write(target, relative, contents, written, skipped) {
    const file = join(target, relative)
    mkdirSync(dirname(file), { recursive: true })

    try {
        writeFileSync(file, contents, { flag: 'wx' })
    } catch (error) {
        if (error.code !== 'EEXIST') throw error
        skipped.push(relative)
        return
    }
    written.push(relative)
}

// Resolved against this file: `npm create` runs the bin from a cache.
const templateRoot = (template) => join(import.meta.dirname, 'templates', template)

// npm strips `.gitignore` from published tarballs, so it ships renamed.
const TEMPLATE_RENAMES = {
    _gitignore: '.gitignore',
}

function templateFiles(root, prefix = '') {
    const entries = readdirSync(join(root, prefix), { withFileTypes: true }).toSorted((a, b) =>
        a.name.localeCompare(b.name),
    )
    return entries.flatMap((entry) => {
        const relative = prefix ? `${prefix}/${entry.name}` : entry.name
        return entry.isDirectory() ? templateFiles(root, relative) : [relative]
    })
}

/** Replaces the whole literal, so the title keeps its JSON escaping. */
const withTitle = (source, title) => source.replaceAll('"__JAAD_TITLE__"', JSON.stringify(title))

const manifestPath = (target) => join(target, 'package.json')

function readManifest(target) {
    const file = manifestPath(target)
    if (!existsSync(file)) return { manifest: null, issue: null }

    const source = readFileSync(file, 'utf8').replace(/^\uFEFF/, '')
    let manifest
    try {
        manifest = JSON.parse(source)
    } catch {
        return {
            manifest: null,
            issue: 'package.json is not valid JSON',
        }
    }

    if (!isRecord(manifest)) {
        return {
            manifest: null,
            issue: 'package.json must contain a JSON object',
        }
    }

    for (const key of ['scripts', 'dependencies', 'devDependencies']) {
        if (key in manifest && !isRecord(manifest[key])) {
            return {
                manifest: null,
                issue: `package.json field ${key} must contain an object`,
            }
        }
    }

    return { manifest, source, issue: null }
}

const isRecord = (value) => typeof value === 'object' && value !== null && !Array.isArray(value)

const normaliseSource = (source) => source.replace(/\r\n/g, '\n').trim()

function existingFiles(target, names) {
    return names.filter((name) => existsSync(join(target, name)))
}

function inspectConfig(target, names, canonical, label, issues) {
    const files = existingFiles(target, names)
    if (files.length > 1) {
        issues.push(`multiple ${label} files found: ${files.join(', ')}`)
        return null
    }

    const file = files[0] ?? null
    if (
        file &&
        canonical !== null &&
        normaliseSource(readFileSync(join(target, file), 'utf8')) !== normaliseSource(canonical)
    ) {
        issues.push(`${file} contains a custom ${label}`)
    }
    return file
}

function failSetup(issues) {
    fail(
        `cannot safely update this project:\n${issues.map((item) => `  - ${item}`).join('\n')}\n` +
            `No files were changed. Integrate JAAD manually: ${MANUAL_SETUP_URL}`,
    )
}

/** Inspect everything before writing: a failed --here setup is a no-op. */
function inspectExistingProject(target) {
    const issues = []
    const { manifest, source, issue: manifestIssue } = readManifest(target)
    if (manifestIssue) issues.push(manifestIssue)

    const astroConfig = inspectConfig(target, ASTRO_CONFIG_NAMES, ASTRO_CONFIG, 'Astro configuration', issues)
    const contentConfig = inspectConfig(target, CONTENT_CONFIG_NAMES, CONTENT_CONFIG, 'content configuration', issues)
    const jaadConfig = inspectConfig(target, JAAD_CONFIG_NAMES, null, 'JAAD configuration', issues)

    if (issues.length > 0) failSetup(issues)

    return { manifest, manifestSource: source ?? null, astroConfig, contentConfig, jaadConfig }
}

/** Writes package.json only when it gains something: "created", "updated" or null. */
function writeManifest(target, existing, source, name) {
    const manifest = completeManifest(existing, {
        name,
        dependencies: { astro: ASTRO, '@jaamd/jaad': JAAD },
    })
    if (existing && JSON.stringify(manifest) === JSON.stringify(existing)) return null

    writeFileSync(manifestPath(target), formatManifest(manifest, source))
    return existing ? 'updated' : 'created'
}

function answer(value) {
    if (p.isCancel(value)) {
        p.cancel('Setup cancelled.')
        return null
    }
    return value
}

const IGNORED_WHEN_EMPTY = ['.git', '.gitignore', '.DS_Store', 'Thumbs.db']

/** Missing, or holding nothing but repository and system files. A file is not empty. */
function isEmptyDirectory(target) {
    if (!existsSync(target)) return true
    if (!statSync(target).isDirectory()) return false

    const entries = readdirSync(target).filter((entry) => !IGNORED_WHEN_EMPTY.includes(entry))
    return entries.length === 0
}

function assertTargetAvailable(args, target) {
    if (args.here || isEmptyDirectory(target)) return
    fail(`${args.dir} exists and is not empty. Use --here to add JAAD to it.`)
}

/** Asks for a directory. The current one, when it is not empty, is used only once confirmed. */
async function askDirectory(args) {
    const dir = answer(
        await p.text({
            message: 'Where should we create the project?',
            placeholder: DEFAULT_DIR,
            defaultValue: DEFAULT_DIR,
            validate(value) {
                const { dir, here } = normaliseDir({ dir: value || DEFAULT_DIR, here: false })
                if (!here && !isEmptyDirectory(resolve(dir))) {
                    return `${dir} is not empty: pick another directory, or run this inside it with --here.`
                }
                return undefined
            },
        }),
    )
    if (dir === null) return false

    args.dir = dir
    normaliseDir(args)
    if (!args.here || isEmptyDirectory(resolve('.'))) return true

    const confirmed = answer(
        await p.confirm({
            message: 'The current directory is not empty. Add JAAD to it?',
            initialValue: false,
        }),
    )
    if (confirmed === false) p.cancel('Setup cancelled.')
    return confirmed === true
}

async function collectAnswers(args) {
    const interactive = Boolean(process.stdin.isTTY && process.stdout.isTTY)
    if (!interactive) {
        const missing = missingAnswers(args)
        if (missing.length > 0) {
            fail(`missing answers in non-interactive mode: ${missing.join(', ')}.`)
        }
    }

    if (interactive) {
        process.stdout.write('\n')
        p.intro(
            `📚 ${styleText('cyan', 'JAAD', { stream: process.stdout })} · Just Another Astro Docs — Write markdown. Get docs.`,
        )
    }

    if (!args.here && !args.dir && !(await askDirectory(args))) return null

    const target = resolve(args.here ? '.' : args.dir)
    assertTargetAvailable(args, target)

    const existing = args.here
        ? inspectExistingProject(target)
        : {
              manifest: null,
              manifestSource: null,
              astroConfig: null,
              contentConfig: null,
              jaadConfig: null,
          }
    const manifest = existing.manifest

    if (!args.template && !interactive) args.template = DEFAULT_TEMPLATE

    if (!args.template) {
        const template = answer(
            await p.select({
                message: 'What are you building?',
                initialValue: 'docs',
                options: [
                    {
                        value: 'docs',
                        label: 'Documentation site',
                        hint: 'docs at /',
                    },
                    {
                        value: 'site',
                        label: 'Website with documentation',
                        hint: 'landing page at /, docs at /docs',
                    },
                ],
            }),
        )
        if (template === null) return null
        args.template = template
    }

    if (args.template === 'site' && existing.jaadConfig) {
        failSetup([
            `${existing.jaadConfig} already configures JAAD, so the site template ` +
                'cannot add a landing page: it needs routeBase: "/docs"',
        ])
    }

    const suggested =
        typeof manifest?.name === 'string' && manifest.name ? titleFrom(manifest.name) : titleFrom(basename(target))

    if (!args.title) {
        const title = answer(
            await p.text({
                message: 'Site title',
                placeholder: suggested,
                defaultValue: suggested,
            }),
        )
        if (title === null) return null
        args.title = title
    }

    if (args.install === null) {
        const install = answer(
            await p.confirm({
                message: `Install dependencies now?`,
                initialValue: true,
            }),
        )
        if (install === null) return null
        args.install = install
    }

    return { ...args, target, manifest, existing }
}

function scaffold(request) {
    const { target, manifest, title, template, existing } = request
    mkdirSync(target, { recursive: true })

    const written = []
    const skipped = []

    if (existing.astroConfig) skipped.push(existing.astroConfig)
    else write(target, 'astro.config.mjs', ASTRO_CONFIG, written, skipped)

    if (existing.contentConfig) skipped.push(existing.contentConfig)
    else {
        write(target, 'src/content.config.ts', CONTENT_CONFIG, written, skipped)
    }

    const ownsRoot = INDEX_PAGE_NAMES.some((name) => existsSync(join(target, 'src', 'pages', name)))
    const found = markdownUnder(join(target, 'docs'))
    // JAAD prefers the .svg, so ours would quietly outrank an existing icon.
    const hasFavicon = FAVICON_NAMES.some((name) => existsSync(join(target, 'public', name)))

    // The shared layer first; a template that repeats a file wins over it.
    const roots = [templateRoot('_shared'), templateRoot(template)]
    const sources = new Map()
    for (const root of roots) {
        for (const relative of templateFiles(root)) sources.set(relative, root)
    }

    for (const [relative, root] of sources) {
        if (relative === 'jaad.config.ts' && existing.jaadConfig) {
            skipped.push(existing.jaadConfig)
            continue
        }
        if (relative.startsWith('src/') && ownsRoot) continue
        if (relative.startsWith('docs/') && found > 0) continue
        if (relative === 'public/favicon.svg' && hasFavicon) continue

        const source = readFileSync(join(root, relative), 'utf8')
        const destination = TEMPLATE_RENAMES[relative] ?? relative
        write(target, destination, withTitle(source, title), written, skipped)
    }

    const manifestChange = writeManifest(target, manifest, existing.manifestSource, basename(target))
    return { written, skipped, found, manifestChange }
}

async function main() {
    let args
    try {
        args = parseArgs(process.argv.slice(2))
        if (args.help) return console.log(HELP)
    } catch (error) {
        console.error(error.message)
        process.exitCode = 1
        return
    }

    let request
    try {
        request = await collectAnswers(args)
    } catch (error) {
        p.log.error(error.message)
        process.exitCode = 1
        return
    }
    if (!request) {
        process.exitCode = 1
        return
    }

    let result
    try {
        result = scaffold(request)
    } catch (error) {
        p.log.error(`could not write the project: ${error.message}`)
        process.exitCode = 1
        return
    }

    const { written, skipped, found, manifestChange } = result
    p.log.success(request.title)

    const changed = written.map((file) => `created  ${file}`)
    if (manifestChange) changed.push(`${manifestChange}  package.json`)
    if (changed.length > 0) p.log.step(changed.join('\n'))

    const kept = [
        ...skipped.map((file) => `kept     ${file}`),
        ...(manifestChange ? [] : ['kept     package.json']),
        ...(found > 0 ? [`found    ${found} markdown file(s) in docs/`] : []),
    ]
    if (kept.length > 0) p.log.info(kept.join('\n'))

    const pm = packageManager()
    if (request.install) {
        const options = { cwd: request.target, stdio: 'inherit' }
        // npm and pnpm are .cmd shims on Windows, run through a shell, which
        // takes one command line rather than an argument list.
        const installed =
            process.platform === 'win32'
                ? spawnSync(`${pm} install`, { ...options, shell: true })
                : spawnSync(pm, ['install'], options)
        if (installed.status !== 0) {
            p.log.error(installed.error ? `could not run ${pm}: ${installed.error.message}` : `${pm} install failed.`)
            process.exitCode = 1
            return
        }
    }

    const next = []
    if (!request.here) next.push(`cd ${quoteArg(request.dir)}`)
    if (!request.install) next.push(`${pm} install`)
    next.push(devCommand(pm, request.manifest?.scripts))

    const start = written.includes('docs/01-introduction.md') ? 'docs/01-introduction.md' : 'docs/'
    p.note(`${next.join('\n')}\n\nStart writing in ${start}`, 'Next steps')
    p.outro('Happy documenting! ✨')
}

await main()
