import type { RenderedMarkdown } from './model/rendered.ts'

export interface DocsNavItem {
    title: string
    /** Set when the docs are split into sections. */
    section?: string
    chapter: string | undefined
    href: string
    isActive: boolean
}

export interface DocsHeading {
    depth: 2 | 3
    slug: string
    text: string
}

/** Resolved frontmatter. Mirrors the schema in content.ts. */
export interface DocsPageData {
    title?: string
    description?: string
    label?: string
    translationKey?: string
    order?: number
    draft: boolean
    keywords: string[]
    author?: string
    ogImage?: string | false
    lastUpdated?: Date
}

/** The shape jaad requires of a docs collection entry. Astro generates
 *  collection types in the consumer project, so the package states its own contract. */
export interface DocsEntry {
    id: string
    body?: string
    data: DocsPageData
    rendered?: RenderedMarkdown
}
