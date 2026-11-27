import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { TEMPLATES } from './templates.mjs'

// Where the help's descriptions start, under the options'.
const HELP_COLUMN = ' '.repeat(30)

/** The templates' column of the help: each name, padded, then what it makes. */
function templateLines(preset) {
    const width = Math.max(
        ...preset.templates.map((name) => {
            return name.length
        }),
    )
    return preset.templates
        .map((name) => {
            const isDefault = name === preset.defaultTemplate ? ' (default)' : ''
            return `${HELP_COLUMN}${name.padEnd(width)}  ${TEMPLATES[name].hint}${isDefault}`
        })
        .join('\n')
}

/** The usage of the entry point `preset` describes. */
export function helpOf(preset) {
    return `Usage: npm create ${preset.create}@latest [directory] -- [options]

npm hands options on only after --; pnpm, yarn and bun need no --.

  --here                    Set up the project in the current directory.
  --template <name>         What to create:
${templateLines(preset)}
  --title <title>           Site title.
  --install                 Install dependencies.
  --no-install              Write the files and stop.
  -h, --help                Show this.
`
}

/** Errors are thrown without the command's name, which the entry point adds. */
export function fail(message) {
    throw new Error(message)
}

function takeValue(argv, index, option) {
    const value = argv[index + 1]
    if (!value || value.startsWith('-')) {
        fail(`${option} needs a value.`)
    }
    return value
}

const VALUE_OPTIONS = ['--template', '--title']

/** `--title=Docs` as `--title Docs`, the one form the options are read in. */
function splitInlineValues(argv) {
    return argv.flatMap((arg) => {
        const equals = arg.indexOf('=')
        const option = arg.slice(0, equals)
        if (equals === -1 || !VALUE_OPTIONS.includes(option)) {
            return [arg]
        }
        return [option, arg.slice(equals + 1)]
    })
}

/** A prompt answer reaches no shell, so `~` is expanded here. */
function expandHome(dir) {
    if (dir === '~') {
        return homedir()
    }
    if (dir.startsWith('~/')) {
        return join(homedir(), dir.slice(2))
    }
    return dir
}

/** A path naming the current directory is --here, however it was spelled. */
export function normaliseDir(args) {
    if (typeof args.dir === 'string') {
        const dir = expandHome(args.dir.trim())
        args.dir = dir === '' ? null : dir
    }
    if (args.dir && resolve(args.dir) === resolve('.')) {
        args.here = true
        args.dir = null
    }
    return args
}

export function parseArgs(rawArgv, preset) {
    const argv = splitInlineValues(rawArgv)
    const args = {
        here: false,
        install: null,
        template: null,
        title: null,
        dir: null,
        help: false,
    }

    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i]
        // What npm leaves behind when it hands the options on.
        if (arg === '--') {
            continue
        }
        if (arg === '--here') {
            args.here = true
        } else if (arg === '--template') {
            args.template = takeValue(argv, i++, arg)
        } else if (arg === '--title') {
            args.title = takeValue(argv, i++, arg)
        } else if (arg === '--install') {
            if (args.install === false) {
                fail('--install and --no-install cannot be used together.')
            }
            args.install = true
        } else if (arg === '--no-install') {
            if (args.install === true) {
                fail('--install and --no-install cannot be used together.')
            }
            args.install = false
        } else if (arg === '-h' || arg === '--help') {
            args.help = true
        } else if (arg.startsWith('-')) {
            fail(`unknown option ${arg}.`)
        } else if (args.dir) {
            fail('only one directory can be provided.')
        } else {
            args.dir = arg
        }
    }

    if (args.here && args.dir) {
        fail('--here cannot be used together with a directory.')
    }
    normaliseDir(args)
    if (args.template && !preset.templates.includes(args.template)) {
        fail(unknownTemplate(args.template, preset))
    }

    return args
}

function unknownTemplate(template, preset) {
    const available = `available: ${preset.templates.join(', ')}.`
    if (template in TEMPLATES) {
        return `${template} is not a template of ${preset.create}; ${available} npm create @jaamd offers every template.`
    }
    return `unknown template ${template}; ${available}`
}

/** Quotes a path for the commands we print. */
export const quoteArg = (value) => {
    return /^[\w./@-]+$/.test(value) ? value : `"${value.replace(/(["\\$`])/g, '\\$1')}"`
}

/** "my-docs" becomes "My Docs", which is right often enough to offer. */
export const titleFrom = (name) => {
    return (
        name
            .replace(/^@[^/]+\//, '')
            .split(/[-_.\s]+/)
            .filter(Boolean)
            .map((word) => {
                return word[0].toUpperCase() + word.slice(1)
            })
            .join(' ') || 'My Site'
    )
}

export function packageManager() {
    const agent = process.env.npm_config_user_agent ?? ''
    for (const name of ['pnpm', 'yarn', 'bun']) {
        if (agent.startsWith(name)) {
            return name
        }
    }
    return 'npm'
}

const PACKAGE_RUNNERS = {
    npm: 'npx',
    pnpm: 'pnpm exec',
    yarn: 'yarn',
    bun: 'bunx',
}

/** How to start Astro: the `dev` script, unless the project uses that name for something else. */
export function devCommand(pm, scripts = {}) {
    const dev = scripts.dev
    if (typeof dev !== 'string' || /\bastro\b/.test(dev)) {
        return `${pm} run dev`
    }
    return `${PACKAGE_RUNNERS[pm]} astro dev`
}

const SCRIPTS = {
    dev: 'astro dev',
    build: 'astro build',
    preview: 'astro preview',
}

/**
 * The manifest with what the template needs added: the missing scripts, after the
 * existing ones, and the missing dependencies. `type` is set only on a manifest
 * we create: adding it to someone's library would change how Node reads every
 * file in it, and `astro.config.mjs` is ESM either way.
 */
export function completeManifest(existing, { name, dependencies }) {
    const manifest = existing ? structuredClone(existing) : { name, private: true, type: 'module' }

    const scripts = { ...manifest.scripts }
    for (const [script, command] of Object.entries(SCRIPTS)) {
        if (!(script in scripts)) {
            scripts[script] = command
        }
    }
    manifest.scripts = scripts

    const declared = { ...manifest.devDependencies, ...manifest.dependencies }
    const missing = Object.entries(dependencies).filter(([dependency]) => {
        return !(dependency in declared)
    })
    if (missing.length > 0) {
        manifest.dependencies = { ...manifest.dependencies, ...Object.fromEntries(missing) }
    }

    return manifest
}

/** The manifest as text, indented as the file it replaces. */
export function formatManifest(manifest, source = null) {
    const indent = source?.match(/^[ \t]+(?=")/m)?.[0] ?? 2
    return JSON.stringify(manifest, null, indent) + '\n'
}

export function missingAnswers(args, preset) {
    const missing = []
    if (!args.here && !args.dir) {
        missing.push('directory ([directory] or --here)')
    }
    if (!args.template && !preset.defaultTemplate) {
        missing.push('template (--template <name>)')
    }
    if (!args.title) {
        missing.push('title (--title <title>)')
    }
    if (args.install === null) {
        missing.push('installation (--install or --no-install)')
    }
    return missing
}

const pad = (value) => {
    return String(value).padStart(2, '0')
}

/** The day of `date` where its author is, as `2026-11-22`, as `jaab new` dates a post. */
export function localDay(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}
