import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { walk } from './dist.mjs'

/** Throwaway projects inside `fixture`, so they resolve astro and the packages
 *  from its node_modules. `defaults` are files every project starts with. */
export function projectsIn(fixture, defaults = {}) {
    const parents = []

    /** A project with `files`, by path from its root, over the defaults. A path
     *  starting with `../` lands beside the project, in a directory of its own. */
    const project = (files = {}) => {
        const parent = mkdtempSync(join(fixture, '.project-'))
        parents.push(parent)

        const root = join(parent, 'site')
        for (const [path, content] of Object.entries({ ...defaults, ...files })) {
            mkdirSync(join(root, path, '..'), { recursive: true })
            writeFileSync(join(root, path), content)
        }
        return root
    }

    /** Removes every project; for `after`. */
    const removeProjects = () => {
        for (const parent of parents) {
            rmSync(parent, { recursive: true, force: true })
        }
    }

    return { project, removeProjects }
}

/** Astro's inline configuration for a project: no config file, no output. */
export function inline(root, integrations, astro = {}) {
    return { root, configFile: false, logLevel: 'silent', integrations, ...astro }
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
