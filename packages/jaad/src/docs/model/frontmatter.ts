import { parse as parseYaml } from 'yaml'

/** The fields read before the content collection exists: `order` and `draft`
 *  decide the opening pages and the links to drafts. Read as YAML, the way the
 *  collection reads them. */
export function readFrontmatter(source: string): { order?: number; draft?: boolean } {
    const block = /^\uFEFF?---\r?\n([\s\S]*?)\r?\n---/.exec(source)
    if (!block) return {}

    let data: unknown
    try {
        data = parseYaml(block[1])
    } catch {
        // The content collection reports the error when it loads the file.
        return {}
    }
    if (!data || typeof data !== 'object') return {}

    const { order, draft } = data as Record<string, unknown>
    return {
        order: typeof order === 'number' ? order : undefined,
        draft: draft === true,
    }
}
