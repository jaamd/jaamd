export interface ParsedDocsCollectionId {
    slug: string
    orderChapter?: number
    chapter?: string
    order: number
    title: string
}

export interface DocsNavItem {
    title: string
    /** Set when the docs are split into sections. */
    section?: string
    chapter: string | undefined
    primaryOrder: number
    href: string
    isActive: boolean
}

export interface DocsHeadings {
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

/** The shape jaad requires of the docs collection. Astro generates collection
 *  types in the consumer project, so the package states its own contract. */
export interface DocsEntry {
    id: string
    /** The id without its locale directory and its section. */
    localeId?: string
    /** Set when the docs are localised. */
    locale?: string
    /** Set when the docs are split into sections. */
    section?: string
    /** Position of the section among the declared ones. */
    sectionOrder?: number
    body?: string
    data: DocsPageData
}
