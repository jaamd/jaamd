import { fileURLToPath } from 'node:url'

/** Injected scripts resolve from the consumer's project, where a bare
 *  "@jaamd/jaamd/…" specifier is unreachable when jaamd is a transitive
 *  dependency. */
const own = (relative: string): string => JSON.stringify(fileURLToPath(new URL(relative, import.meta.url)))

export const paths = {
    variables: own('./styles/variables.css'),
    shikiDual: own('./styles/shiki-dual.css'),
    markdown: own('./styles/markdown.css'),
    client: own('./scripts/enhancements.ts'),
}

/** URL of the module re-exporting Astro's `rehypeHeadingIds`, for a string plugin entry. */
export const rehypeHeadingIdsEntry = new URL('./plugins/rehype-heading-ids.js', import.meta.url).href
