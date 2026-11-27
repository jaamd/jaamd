import type { AuthorsField } from '@jaamd/site/authors.ts'
import type { RenderedMarkdown } from '@jaamd/site/rendered.ts'

/** Resolved frontmatter of a post. Mirrors the schema in content.ts. */
export interface PostData {
    title?: string
    description?: string
    date: Date
    tags: string[]
    authors?: AuthorsField
    aliases: string[]
    keywords: string[]
    /** The older single name; `authors` is the field to write. */
    author?: string
    ogImage?: string | false
    lastUpdated?: Date
}

/** The shape JAAB requires of a collection entry. Astro generates collection
 *  types in the consumer project, so the package states its own contract. */
export interface PostEntry {
    id: string
    /** Relative to the project, as Astro's glob loader records it. */
    filePath?: string
    body?: string
    data: PostData
    rendered?: RenderedMarkdown
}

/** The blog's own `index.md`. */
export interface IntroEntry {
    id: string
    filePath?: string
    body?: string
    data: { title?: string; description?: string }
    rendered?: RenderedMarkdown
}
