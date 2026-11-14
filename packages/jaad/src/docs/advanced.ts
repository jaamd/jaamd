import type { DocsNavigation } from './navigation.ts'
import type { DocsHeading, DocsPageData } from './types.ts'

/** Data available to an advanced documentation frame. */
export interface DocsFrameProps {
    page: {
        /** Content collection id, without the Markdown extension. */
        id: string
        /** File-derived slug. The opening page keeps its named slug here. */
        slug: string
        title: string
        /** Set when the docs are split into sections. */
        section?: string
        chapter?: string
        /** Raw frontmatter. */
        data: DocsPageData
    }
    headings: DocsHeading[]
    navigation: DocsNavigation
}

export type { DocsHeading, DocsNavItem, DocsPageData } from './types.ts'
export type { DocsNavEntry, DocsNavGroup, DocsNavigation } from './navigation.ts'
