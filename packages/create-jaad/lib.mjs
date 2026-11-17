import { homedir } from 'node:os'
import { join, resolve } from 'node:path'

export const TEMPLATES = ['docs', 'site']
export const DEFAULT_TEMPLATE = 'docs'

export const HELP = `Usage: npm create @jaamd/jaad@latest [directory] [options]

  --here                    Set up JAAD in the current directory.
  --template <docs|site>    Docs at / (default), or a landing page with
                            docs at /docs.
  --title <title>           Site title.
  --install                 Install dependencies.
  --no-install              Write the files and stop.
  -h, --help                Show this.
`

export function fail(message) {
    throw new Error(`create-jaad: ${message}`)
}

function takeValue(argv, index, option) {
    const value = argv[index + 1]
    if (!value || value.startsWith('-')) fail(`${option} needs a value.`)
    return value
}

/** A prompt answer reaches no shell, so `~` is expanded here. */
function expandHome(dir) {
    if (dir === '~') return homedir()
    if (dir.startsWith('~/')) return join(homedir(), dir.slice(2))
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

export function parseArgs(argv) {
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
        if (arg === '--here') args.here = true
        else if (arg === '--template') args.template = takeValue(argv, i++, arg)
        else if (arg === '--title') args.title = takeValue(argv, i++, arg)
        else if (arg === '--install') {
            if (args.install === false) {
                fail('--install and --no-install cannot be used together.')
            }
            args.install = true
        } else if (arg === '--no-install') {
            if (args.install === true) {
                fail('--install and --no-install cannot be used together.')
            }
            args.install = false
        } else if (arg === '-h' || arg === '--help') args.help = true
        else if (arg.startsWith('-')) fail(`unknown option ${arg}.`)
        else if (args.dir) fail('only one directory can be provided.')
        else args.dir = arg
    }

    if (args.here && args.dir) {
        fail('--here cannot be used together with a directory.')
    }
    normaliseDir(args)
    if (args.template && !TEMPLATES.includes(args.template)) {
        fail(`unknown template ${args.template}; available: ${TEMPLATES.join(', ')}.`)
    }

    return args
}

/** Quotes a path for the commands we print. */
export const quoteArg = (value) => (/^[\w./@-]+$/.test(value) ? value : `"${value.replace(/(["\\$`])/g, '\\$1')}"`)

/** "my-docs" becomes "My Docs", which is right often enough to offer. */
export const titleFrom = (name) =>
    name
        .replace(/^@[^/]+\//, '')
        .split(/[-_.\s]+/)
        .filter(Boolean)
        .map((word) => word[0].toUpperCase() + word.slice(1))
        .join(' ') || 'Documentation'

export function packageManager() {
    const agent = process.env.npm_config_user_agent ?? ''
    for (const name of ['pnpm', 'yarn', 'bun']) {
        if (agent.startsWith(name)) return name
    }
    return 'npm'
}

const SCRIPTS = {
    dev: 'astro dev',
    build: 'astro build',
    preview: 'astro preview',
}

/**
 * The manifest with what JAAD needs added: the missing scripts, after the
 * existing ones, and the missing dependencies. `type` is set only on a manifest
 * we create: adding it to someone's library would change how Node reads every
 * file in it, and `astro.config.mjs` is ESM either way.
 */
export function completeManifest(existing, { name, dependencies }) {
    const manifest = existing ? structuredClone(existing) : { name, private: true, type: 'module' }

    const scripts = { ...manifest.scripts }
    for (const [script, command] of Object.entries(SCRIPTS)) {
        if (!(script in scripts)) scripts[script] = command
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

export function missingAnswers(args) {
    const missing = []
    if (!args.here && !args.dir) missing.push('directory ([directory] or --here)')
    if (!args.title) missing.push('title (--title <title>)')
    if (args.install === null) {
        missing.push('installation (--install or --no-install)')
    }
    return missing
}
