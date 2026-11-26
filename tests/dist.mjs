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

export const escapeClass = (cls) => {
    return cls.replace(/[.:/[\]%()!,#]/g, (c) => {
        return '\\' + c
    })
}

const QUOTED = /(["'])([^"']+)\1/g

/** Every class the `.astro` files under `srcDir` write, in markup and scripts alike. */
export function packageClasses(srcDir) {
    const classes = new Set()
    const add = (value) => {
        for (const token of value.split(/\s+/)) {
            if (token) {
                classes.add(token)
            }
        }
    }
    for (const file of walk(srcDir).filter((f) => {
        return f.endsWith('.astro')
    })) {
        const source = readFileSync(file, 'utf8')
        // Either quote, in markup, expressions and scripts alike.
        for (const m of source.matchAll(/\bclass(?:Name)?=(["'])([^"'{}]+)\1/g)) {
            add(m[2])
        }
        for (const m of source.matchAll(/\bclass=\{([^}]*)\}/g)) {
            for (const lit of m[1].matchAll(QUOTED)) {
                add(lit[2])
            }
        }
        for (const m of source.matchAll(/\bclass:list=\{\[([^\]]*)\]\}/g)) {
            for (const lit of m[1].matchAll(QUOTED)) {
                add(lit[2])
            }
        }
        for (const m of source.matchAll(
            /\.(?:className\s*=|classList\.(?:add|remove|toggle)\()\s*(["'`])([^"'`$]+)\1/g,
        )) {
            add(m[2])
        }
    }
    return classes
}

/** The classes no rule of `css` selects, sorted. */
export function missingFrom(css, classes) {
    return [...classes]
        .filter((c) => {
            return !css.includes('.' + escapeClass(c))
        })
        .toSorted()
}
