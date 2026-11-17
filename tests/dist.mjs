/** Reading a build output: shared by the tests of every project that builds one. */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

/** Every file under `dir`, at any depth. */
export function walk(dir) {
    if (!existsSync(dir)) {
        throw new Error(`no build at ${dir}: run the build first`)
    }

    return readdirSync(dir).flatMap((entry) => {
        const path = join(dir, entry)
        return statSync(path).isDirectory() ? walk(path) : [path]
    })
}

/** A built file of `dist`, by its path inside it. */
export function readBuilt(dist, relative) {
    const file = join(dist, relative)
    if (!existsSync(file)) {
        throw new Error(`built page missing: ${relative}: run the build first`)
    }
    return readFileSync(file, 'utf8')
}

/** The stylesheets of `dist`, linked and inline, as one string. */
export function allCss(dist) {
    const files = walk(dist)
    const linked = files
        .filter((file) => {
            return file.endsWith('.css')
        })
        .map((file) => {
            return readFileSync(file, 'utf8')
        })
    const inline = files
        .filter((file) => {
            return file.endsWith('.html')
        })
        .flatMap((file) => {
            const html = readFileSync(file, 'utf8')
            return [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((match) => {
                return match[1]
            })
        })
    return [...linked, ...inline].join('\n')
}

/** Whether a static host serves a file at `path`: the file, its directory's
 *  index, or the page with `.html`. A directory alone serves nothing. */
export function resolves(dist, path) {
    const candidates = [join(dist, path), join(dist, path, 'index.html'), join(dist, `${path}.html`)]
    return candidates.some((file) => {
        return existsSync(file) && statSync(file).isFile()
    })
}

/** Root-relative links of every page that lead to no built file, as "page → href". */
export function brokenLinks(dist) {
    const broken = walk(dist)
        .filter((file) => {
            return file.endsWith('.html')
        })
        .flatMap((file) => {
            const hrefs = [...readFileSync(file, 'utf8').matchAll(/href="(\/(?!\/)[^"#?]*)/g)].map((match) => {
                return decodeURI(match[1])
            })
            return hrefs
                .filter((href) => {
                    return !resolves(dist, href)
                })
                .map((href) => {
                    return `${file.slice(dist.length)} → ${href}`
                })
        })
    return [...new Set(broken)]
}
