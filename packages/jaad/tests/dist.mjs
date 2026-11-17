import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { allCss as allCssIn, readBuilt, walk } from '../../../tests/dist.mjs'

export { walk }

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
export const DIST = join(ROOT, 'tests', 'fixture', 'dist')

export function page(relative) {
    return readBuilt(DIST, relative)
}

export function distFiles(ext) {
    return walk(DIST).filter((file) => {
        return file.endsWith(ext)
    })
}

export function allCss() {
    return allCssIn(DIST)
}

export const escapeClass = (cls) => cls.replace(/[.:/[\]%()!,#]/g, (c) => '\\' + c)

export function packageClasses(srcDir) {
    const classes = new Set()
    const add = (value) => {
        for (const token of value.split(/\s+/)) if (token) classes.add(token)
    }
    for (const file of walk(srcDir).filter((f) => f.endsWith('.astro'))) {
        const source = readFileSync(file, 'utf8')
        for (const m of source.matchAll(/\bclass(?:Name)?="([^"{}]+)"/g)) add(m[1])
        for (const m of source.matchAll(/\bclass=\{([^}]*)\}/g)) {
            for (const lit of m[1].matchAll(/"([^"]+)"/g)) add(lit[1])
        }
        for (const m of source.matchAll(/\bclass:list=\{\[([^\]]*)\]\}/g)) {
            for (const lit of m[1].matchAll(/"([^"]+)"/g)) add(lit[1])
        }
        for (const m of source.matchAll(/\.(?:className\s*=|classList\.(?:add|remove|toggle)\()\s*"([^"]+)"/g)) {
            add(m[1])
        }
    }
    return classes
}

/** Custom properties declared in a stylesheet's `@theme` block. */
export function themeTokens(css) {
    const start = css.indexOf('{', css.indexOf('@theme'))
    let depth = 0
    let end = start
    for (; end < css.length; end++) {
        if (css[end] === '{') depth++
        else if (css[end] === '}' && --depth === 0) break
    }
    return [...css.slice(start, end).matchAll(/^\s*(--[a-z0-9-]+)\s*:/gm)].map((m) => m[1])
}

export function missingFrom(css, classes) {
    return [...classes].filter((c) => !css.includes('.' + escapeClass(c))).toSorted()
}
