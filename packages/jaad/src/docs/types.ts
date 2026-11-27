import type { AuthorsField } from '@jaamd/site/authors.ts'
import type { PageHeading, RenderedMarkdown } from '@jaamd/site/rendered.ts'

export interface DocsNavItem {
    title: string
    /** Set when the docs are split into sections. */
    section?: string | undefined
    chapter?: string | undefined
    href: string
    isActive: boolean
}

/** An h2 or h3 of a page, as the table of contents lists it. */
export type DocsHeading = PageHeading

/** Resolved frontmatter. Mirrors the schema in content.ts. */
export interface DocsPageData {
    title?: string
    description?: string
    label?: string
    translationKey?: string
    order?: number
    keywords: string[]
    authors?: AuthorsField
    /** The older single name; `authors` is the field to write. */
    author?: string
    ogImage?: string | false
    lastUpdated?: Date
}

/** The shape jaad requires of a docs collection entry. Astro generates
 *  collection types in the consumer project, so the package states its own contract. */
export interface DocsEntry {
    id: string
    /** Relative to the project, as Astro's glob loader records it. */
    filePath?: string
    body?: string
    data: DocsPageData
    rendered?: RenderedMarkdown
}
