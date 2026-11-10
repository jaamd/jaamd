import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const DIST = fileURLToPath(new URL('../dist', import.meta.url))

export function walk(dir = DIST) {
    if (!existsSync(dir)) throw new Error(`no build at ${dir}: run the build first`)
    return readdirSync(dir).flatMap((entry) => {
        const path = join(dir, entry)
        return statSync(path).isDirectory() ? walk(path) : [path]
    })
}

export function page(relative) {
    const file = join(DIST, relative)
    if (!existsSync(file)) throw new Error(`built page missing: ${relative}`)
    return readFileSync(file, 'utf8')
}

export function allCss() {
    const files = walk()
    const linked = files.filter((f) => f.endsWith('.css')).map((f) => readFileSync(f, 'utf8'))
    const inline = files
        .filter((f) => f.endsWith('.html'))
        .flatMap((f) => [...readFileSync(f, 'utf8').matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]))
    return [...linked, ...inline].join('\n')
}
