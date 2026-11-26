import { parse as parseYaml } from 'yaml'

/** A file's frontmatter as YAML reads it, for what a package checks before the
 *  content collection exists. Empty when the file has none, or when it does
 *  not parse: the collection reports that error when it loads the file. Dates
 *  stay as written, since YAML's core schema has no timestamps. */
export function readFrontmatter(source: string): Record<string, unknown> {
    const block = /^﻿?---\r?\n([\s\S]*?)\r?\n---/.exec(source)
    if (!block) {
        return {}
    }

    let data: unknown
    try {
        data = parseYaml(block[1])
    } catch {
        return {}
    }
    return data && typeof data === 'object' ? (data as Record<string, unknown>) : {}
}
