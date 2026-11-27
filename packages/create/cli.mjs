import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { styleText } from 'node:util'
import * as p from '@clack/prompts'
import {
    completeManifest,
    devCommand,
    fail,
    formatManifest,
    helpOf,
    localDay,
    missingAnswers,
    normaliseDir,
    packageManager,
    parseArgs,
    quoteArg,
    titleFrom,
} from './lib.mjs'
import { TEMPLATES, contentDirsOf, presetOf, productOf } from './templates.mjs'

// Every package is released at one version: this one's is JAAD's and JAAB's.
const PACKAGE_RANGE = `^${JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version}`
const ASTRO = '^7.4.2'
// The names Astro itself looks for.
const ASTRO_CONFIG_NAMES = ['astro.config.ts', 'astro.config.mts', 'astro.config.mjs', 'astro.config.js']
const CONTENT_CONFIG_NAMES = [
    'src/content.config.ts',
    'src/content.config.mts',
    'src/content.config.mjs',
    'src/content.config.js',
]
const INDEX_PAGE_NAMES = ['index.astro', 'index.md', 'index.mdx', 'index.html', 'index.js', 'index.ts']
const FAVICON_NAMES = ['favicon.svg', 'favicon.ico', 'favicon.png']

/** The files a package reads its options from, as `loadConfigFile` looks for them. */
const configNamesOf = (template) => {
    const { config } = TEMPLATES[template]
    return ['ts', 'mjs', 'js'].map((extension) => {
        return `${config.name}.${extension}`
    })
}

function markdownUnder(dir) {
    if (!existsSync(dir)) {
        return 0
    }
    return readdirSync(dir, { withFileTypes: true }).reduce((count, entry) => {
        return count + (entry.isDirectory() ? markdownUnder(join(dir, entry.name)) : entry.name.endsWith('.md') ? 1 : 0)
    }, 0)
}

/** Never overwrites: an existing file is the user's, not ours. `wx` also
 *  refuses a symlink, even one that points nowhere yet. */
function write(target, relative, contents, written, skipped) {
    const file = join(target, relative)
    mkdirSync(dirname(file), { recursive: true })

    try {
        writeFileSync(file, contents, { flag: 'wx' })
    } catch (error) {
        if (error.code !== 'EEXIST') {
            throw error
        }
        skipped.push(relative)
        return
    }
    written.push(relative)
}

// Resolved against this file: `npm create` runs the bin from a cache.
const layerRoot = (layer) => {
    return join(import.meta.dirname, 'templates', layer)
}

// npm strips `.gitignore` from published tarballs, so it ships renamed.
const TEMPLATE_RENAMES = {
    _gitignore: '.gitignore',
}

function templateFiles(root, prefix = '') {
    const entries = readdirSync(join(root, prefix), { withFileTypes: true }).toSorted((a, b) => {
        return a.name.localeCompare(b.name)
    })
    return entries.flatMap((entry) => {
        const relative = prefix ? `${prefix}/${entry.name}` : entry.name
        return entry.isDirectory() ? templateFiles(root, relative) : [relative]
    })
}

/** Fills the placeholders. The title replaces the whole literal, so it keeps its JSON escaping. */
const fillTemplate = (source, { title, today }) => {
    return source.replaceAll('"__SITE_TITLE__"', JSON.stringify(title)).replaceAll('__TODAY__', today)
}

const manifestPath = (target) => {
    return join(target, 'package.json')
}

function readManifest(target) {
    const file = manifestPath(target)
    if (!existsSync(file)) {
        return { manifest: null, issue: null }
    }

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

const isRecord = (value) => {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const normaliseSource = (source) => {
    return source.replace(/\r\n/g, '\n').trim()
}

function existingFiles(target, names) {
    return names.filter((name) => {
        return existsSync(join(target, name))
    })
}

/** The template whose config `source` is, other than `template`; null for one of the project's own. */
function otherTemplateOf(source, template, key) {
    const other = Object.keys(TEMPLATES).find((name) => {
        return name !== template && normaliseSource(TEMPLATES[name][key]) === normaliseSource(source)
    })
    return other ?? null
}

function inspectConfig(target, { names, template, key, label }, issues) {
    const files = existingFiles(target, names)
    if (files.length > 1) {
        issues.push(`multiple ${label} files found: ${files.join(', ')}`)
        return null
    }

    const file = files[0] ?? null
    if (file === null || key === null) {
        return file
    }

    const source = readFileSync(join(target, file), 'utf8')
    if (normaliseSource(source) === normaliseSource(TEMPLATES[template][key])) {
        return file
    }

    const other = otherTemplateOf(source, template, key)
    if (other === null) {
        issues.push(`${file} contains a custom ${label}`)
    } else {
        issues.push(`${file} sets up the ${other} template, not ${template}`)
    }
    return file
}

function failSetup(issues, template) {
    const list = issues
        .map((item) => {
            return `  - ${item}`
        })
        .join('\n')

    fail(
        `cannot safely update this project:\n${list}\n` +
            `No files were changed. Integrate ${productOf(template)} manually: ${TEMPLATES[template].setupUrl}`,
    )
}

/** Inspect everything before writing: a failed --here setup is a no-op. */
function inspectExistingProject(target, template) {
    const issues = []
    const { manifest, source, issue: manifestIssue } = readManifest(target)
    if (manifestIssue) {
        issues.push(manifestIssue)
    }

    const astroConfig = inspectConfig(
        target,
        { names: ASTRO_CONFIG_NAMES, template, key: 'astroConfig', label: 'Astro configuration' },
        issues,
    )
    const contentConfig = inspectConfig(
        target,
        { names: CONTENT_CONFIG_NAMES, template, key: 'contentConfig', label: 'content configuration' },
        issues,
    )
    const ownConfig = inspectConfig(
        target,
        { names: configNamesOf(template), template, key: null, label: TEMPLATES[template].config.label },
        issues,
    )

    const { configConflict } = TEMPLATES[template]
    if (configConflict && ownConfig) {
        issues.push(
            `${ownConfig} already configures ${productOf(template)}, so the ${template} template ${configConflict}`,
        )
    }

    if (issues.length > 0) {
        failSetup(issues, template)
    }

    return { manifest, manifestSource: source ?? null, astroConfig, contentConfig, ownConfig }
}

/** Writes package.json only when it gains something: "created", "updated" or null. */
function writeManifest(target, existing, source, { name, template }) {
    const packages = TEMPLATES[template].products.map((product) => {
        return [product.package, PACKAGE_RANGE]
    })
    const manifest = completeManifest(existing, {
        name,
        dependencies: { astro: ASTRO, ...Object.fromEntries(packages) },
    })
    if (existing && JSON.stringify(manifest) === JSON.stringify(existing)) {
        return null
    }

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
    if (!existsSync(target)) {
        return true
    }
    if (!statSync(target).isDirectory()) {
        return false
    }

    const entries = readdirSync(target).filter((entry) => {
        return !IGNORED_WHEN_EMPTY.includes(entry)
    })
    return entries.length === 0
}

function assertTargetAvailable(args, target) {
    if (args.here || isEmptyDirectory(target)) {
        return
    }
    fail(`${args.dir} exists and is not empty. Use --here to add ${productOf(args.template)} to it.`)
}

/** Asks for a directory. The current one, when it is not empty, is used only once confirmed. */
async function askDirectory(args) {
    const fallback = TEMPLATES[args.template].dir
    const dir = answer(
        await p.text({
            message: 'Where should we create the project?',
            placeholder: fallback,
            defaultValue: fallback,
            validate(value) {
                const { dir, here } = normaliseDir({ dir: value || fallback, here: false })
                if (!here && !isEmptyDirectory(resolve(dir))) {
                    return `${dir} is not empty: pick another directory, or run this inside it with --here.`
                }
                return undefined
            },
        }),
    )
    if (dir === null) {
        return false
    }

    args.dir = dir
    normaliseDir(args)
    if (!args.here || isEmptyDirectory(resolve('.'))) {
        return true
    }

    const confirmed = answer(
        await p.confirm({
            message: `The current directory is not empty. Add ${productOf(args.template)} to it?`,
            initialValue: false,
        }),
    )
    if (confirmed === false) {
        p.cancel('Setup cancelled.')
    }
    return confirmed === true
}

async function askTemplate(preset) {
    const options = preset.templates.map((name) => {
        return {
            value: name,
            label: TEMPLATES[name].label,
            hint: TEMPLATES[name].hint,
        }
    })
    return answer(
        await p.select({
            message: 'What are you building?',
            initialValue: preset.defaultTemplate ?? preset.templates[0],
            options,
        }),
    )
}

async function collectAnswers(args, preset) {
    const interactive = Boolean(process.stdin.isTTY && process.stdout.isTTY)
    if (!interactive) {
        const missing = missingAnswers(args, preset)
        if (missing.length > 0) {
            fail(`missing answers in non-interactive mode: ${missing.join(', ')}.`)
        }
    }

    if (interactive) {
        const name = styleText('cyan', preset.name, { stream: process.stdout })
        process.stdout.write('\n')
        p.intro(`${preset.icon} ${name} · ${preset.tagline}`)
    }

    if (!args.template && !interactive) {
        args.template = preset.defaultTemplate
    }

    if (!args.template) {
        const template = await askTemplate(preset)
        if (template === null) {
            return null
        }
        args.template = template
    }

    if (!args.here && !args.dir && !(await askDirectory(args))) {
        return null
    }

    const target = resolve(args.here ? '.' : args.dir)
    assertTargetAvailable(args, target)

    const existing = args.here
        ? inspectExistingProject(target, args.template)
        : {
              manifest: null,
              manifestSource: null,
              astroConfig: null,
              contentConfig: null,
              ownConfig: null,
          }
    const manifest = existing.manifest

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
        if (title === null) {
            return null
        }
        args.title = title
    }

    if (args.install === null) {
        const install = answer(
            await p.confirm({
                message: `Install dependencies now?`,
                initialValue: true,
            }),
        )
        if (install === null) {
            return null
        }
        args.install = install
    }

    return { ...args, target, manifest, existing }
}

function scaffold(request) {
    const { target, manifest, title, template, existing } = request
    const { astroConfig, contentConfig } = TEMPLATES[template]
    mkdirSync(target, { recursive: true })

    const written = []
    const skipped = []

    if (existing.astroConfig) {
        skipped.push(existing.astroConfig)
    } else {
        write(target, 'astro.config.mjs', astroConfig, written, skipped)
    }

    if (existing.contentConfig) {
        skipped.push(existing.contentConfig)
    } else {
        write(target, 'src/content.config.ts', contentConfig, written, skipped)
    }

    const ownsRoot = INDEX_PAGE_NAMES.some((name) => {
        return existsSync(join(target, 'src', 'pages', name))
    })
    const found = Object.fromEntries(
        contentDirsOf(template).map((dir) => {
            return [dir, markdownUnder(join(target, dir))]
        }),
    )
    // The packages prefer the .svg, so ours would quietly outrank an existing icon.
    const hasFavicon = FAVICON_NAMES.some((name) => {
        return existsSync(join(target, 'public', name))
    })

    // A later layer wins over an earlier one.
    const sources = new Map()
    for (const layer of TEMPLATES[template].layers) {
        const root = layerRoot(layer)
        for (const relative of templateFiles(root)) {
            sources.set(relative, root)
        }
    }

    const values = { title, today: localDay(new Date()) }
    const ownConfigFile = `${TEMPLATES[template].config.name}.ts`
    for (const [relative, root] of sources) {
        const contentDir = relative.split('/')[0]
        if (relative === ownConfigFile && existing.ownConfig) {
            skipped.push(existing.ownConfig)
            continue
        }
        if (relative.startsWith('src/') && ownsRoot) {
            continue
        }
        if (found[contentDir] > 0) {
            continue
        }
        if (relative === 'public/favicon.svg' && hasFavicon) {
            continue
        }

        const source = readFileSync(join(root, relative), 'utf8')
        const destination = TEMPLATE_RENAMES[relative] ?? relative
        write(target, destination, fillTemplate(source, values), written, skipped)
    }

    const manifestChange = writeManifest(target, manifest, existing.manifestSource, {
        name: basename(target),
        template,
    })
    return { written, skipped, found, manifestChange }
}

/** Where to start: the sample pages it wrote, or the directories that already had markdown. */
function startingPoints(template, written) {
    const samples = TEMPLATES[template].samples.filter((sample) => {
        return written.includes(sample)
    })
    const dirs = contentDirsOf(template)
        .filter((dir) => {
            return !samples.some((sample) => {
                return sample.startsWith(`${dir}/`)
            })
        })
        .map((dir) => {
            return `${dir}/`
        })
    return [...samples, ...dirs].join(' and ')
}

/** Runs the scaffolder as `preset` names it: `jaamd`, `jaad` or `jaab`. */
export async function main(argv, presetKey) {
    const preset = presetOf(presetKey)
    const withCommand = (message) => {
        return `${preset.command}: ${message}`
    }

    let args
    try {
        args = parseArgs(argv, preset)
        if (args.help) {
            console.log(helpOf(preset))
            return
        }
    } catch (error) {
        console.error(withCommand(error.message))
        process.exitCode = 1
        return
    }

    let request
    try {
        request = await collectAnswers(args, preset)
    } catch (error) {
        p.log.error(withCommand(error.message))
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
        p.log.error(withCommand(`could not write the project: ${error.message}`))
        process.exitCode = 1
        return
    }

    const { written, skipped, found, manifestChange } = result
    p.log.success(request.title)

    const changed = written.map((file) => {
        return `created  ${file}`
    })
    if (manifestChange) {
        changed.push(`${manifestChange}  package.json`)
    }
    if (changed.length > 0) {
        p.log.step(changed.join('\n'))
    }

    const foundLines = Object.entries(found)
        .filter(([, count]) => {
            return count > 0
        })
        .map(([dir, count]) => {
            return `found    ${count} markdown file(s) in ${dir}/`
        })
    const kept = [
        ...skipped.map((file) => {
            return `kept     ${file}`
        }),
        ...(manifestChange ? [] : ['kept     package.json']),
        ...foundLines,
    ]
    if (kept.length > 0) {
        p.log.info(kept.join('\n'))
    }

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
    if (!request.here) {
        next.push(`cd ${quoteArg(request.dir)}`)
    }
    if (!request.install) {
        next.push(`${pm} install`)
    }
    next.push(devCommand(pm, request.manifest?.scripts))

    p.note(`${next.join('\n')}\n\nStart writing in ${startingPoints(request.template, written)}`, 'Next steps')
    p.outro(preset.outro)
}
