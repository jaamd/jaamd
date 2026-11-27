import { readFrontmatter } from '@jaamd/site/frontmatter.ts'

/** `order` read before the content collection exists: it decides the opening
 *  pages. */
export function readOrder(source: string): number | undefined {
    const { order } = readFrontmatter(source)
    return typeof order === 'number' ? order : undefined
}
