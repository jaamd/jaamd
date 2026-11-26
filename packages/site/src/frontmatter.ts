import { parse as parseYaml } from 'yaml'

/** A file's frontmatter as YAML reads it, for what a package checks before the
 *  content collection exists. Empty when the file has none, or when it does
 *  not parse: the collection reports that error when it loads the file. Dates
 *  stay as written, since YAML's core schema has no timestamps. */
export function readFrontmatter(source: string): Record<string, unknown> {
    const yaml = /^﻿?---\r?\n([\s\S]*?)\r?\n---/.exec(source)?.[1]
    if (yaml === undefined) {
        return {}
    }

    let data: unknown
    try {
        data = parseYaml(yaml)
    } catch {
        return {}
    }
    return data && typeof data === 'object' ? (data as Record<string, unknown>) : {}
}
