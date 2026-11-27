import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { allCss as allCssIn, readBuilt, walk } from '../../../tests/dist.mjs'

export { missingFrom, packageClasses, walk } from '../../../tests/dist.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DIST = join(ROOT, 'tests', 'fixture', 'dist')

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

/** Custom properties declared in a stylesheet's `@theme` block. */
export function themeTokens(css) {
    const start = css.indexOf('{', css.indexOf('@theme'))
    let depth = 0
    let end = start
    for (; end < css.length; end++) {
        if (css[end] === '{') {
            depth++
        } else if (css[end] === '}' && --depth === 0) {
            break
        }
    }
    return [...css.slice(start, end).matchAll(/^\s*(--[a-z0-9-]+)\s*:/gm)].map((m) => {
        return m[1]
    })
}
