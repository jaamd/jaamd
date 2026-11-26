import { readFrontmatter as readYaml } from '@jaamd/site/frontmatter.ts'

/** The fields read before the content collection exists: `order` and `draft`
 *  decide the opening pages and the links to drafts. */
export function readFrontmatter(source: string): { order?: number; draft?: boolean } {
    const { order, draft } = readYaml(source)
    return {
        order: typeof order === 'number' ? order : undefined,
        draft: draft === true,
    }
}
