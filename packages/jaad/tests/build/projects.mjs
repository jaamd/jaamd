import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { walk } from '../dist.mjs'

// Inside the fixture, so the projects resolve astro and JAAD from its node_modules.
const FIXTURE = fileURLToPath(new URL('../fixture', import.meta.url))

const roots = []

/** A project with a content config and `files`, by path from its root. A path
 *  starting with `../` lands beside the project, in a directory of its own. */
export function project(files = {}) {
    const parent = mkdtempSync(join(FIXTURE, '.project-'))
    roots.push(parent)

    const root = join(parent, 'site')
    const all = {
        'src/content.config.ts': "export { collections } from '@jaamd/jaad/content'\n",
        ...files,
    }
    for (const [path, content] of Object.entries(all)) {
        mkdirSync(join(root, path, '..'), { recursive: true })
        writeFileSync(join(root, path), content)
    }
    return root
}

/** Astro's inline configuration for a project: no config file, no output. */
export function inline(root, integrations, astro = {}) {
    return { root, configFile: false, logLevel: 'silent', integrations, ...astro }
}

/** Removes every project; for `after`. */
export function removeProjects() {
    for (const parent of roots) {
        rmSync(parent, { recursive: true, force: true })
    }
}

/** The built files of a project, read once. */
export function built(root) {
    const dist = join(root, 'dist')
    const contents = new Map(
        walk(dist).map((file) => {
            return [file.slice(dist.length), readFileSync(file, 'utf8')]
        }),
    )
    const files = [...contents.keys()]

    const read = (relative) => {
        const file = contents.get('/' + relative)
        assert.ok(file !== undefined, `${relative} was not built`)
        return file
    }

    /** The stylesheets one page links and inlines, so a layout's set is testable. */
    const cssOf = (relative) => {
        const html = read(relative)
        const linked = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map((match) => {
            // The href carries Astro's base; the keys of the build do not.
            return contents.get(match[1].slice(match[1].indexOf('/_astro/'))) ?? ''
        })
        const inlined = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((match) => {
            return match[1]
        })
        return [...linked, ...inlined].join('\n')
    }

    return {
        files,
        pages: files.filter((file) => {
            return file.endsWith('.html')
        }),
        read,
        cssOf,
    }
}
