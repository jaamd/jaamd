import type { DocsNavigation } from './navigation.ts'
import type { DocsHeading, DocsPageData } from './types.ts'
import type { Author } from '@jaamd/site/authors.ts'

/** Data available to an advanced documentation frame. */
export interface DocsFrameProps {
    page: {
        /** Content collection id, without the Markdown extension. */
        id: string
        /** File-derived slug. The opening page keeps its named slug here. */
        slug: string
        title: string
        /** Set when the docs are split into sections. */
        section?: string | undefined
        chapter?: string | undefined
        /** Raw frontmatter. */
        data: DocsPageData
        /** Who wrote the page, resolved against the site's `authors`. */
        authors: Author[]
    }
    headings: DocsHeading[]
    navigation: DocsNavigation
}

export type { Author } from '@jaamd/site/authors.ts'
export type { DocsHeading, DocsNavItem, DocsPageData } from './types.ts'
export type { DocsNavEntry, DocsNavGroup, DocsNavigation } from './navigation.ts'
