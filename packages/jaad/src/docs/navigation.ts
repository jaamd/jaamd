import type { DocsTree } from './model/tree.ts'
import type { DocsNavItem } from './types.ts'

/** A page, or a chapter and its pages. */
export type DocsNavEntry =
    | { type: 'page'; item: DocsNavItem }
    | { type: 'chapter'; chapter: string; items: DocsNavItem[] }

/** A top-level entry. With sections, the pages outside them come first, then
 *  every section and its entries. */
export type DocsNavGroup = DocsNavEntry | { type: 'section'; section: string; label: string; entries: DocsNavEntry[] }

export interface DocsNavigation {
    /** The whole tree, in reading order. */
    groups: DocsNavGroup[]
    previousPage: DocsNavItem | null
    nextPage: DocsNavItem | null
}

/** Each chapter sits where its first page does. */
function groupByChapter(items: DocsNavItem[]): DocsNavEntry[] {
    const chapters = new Map<string, DocsNavItem[]>()
    const groups: DocsNavEntry[] = []

    for (const item of items) {
        if (!item.chapter) {
            groups.push({ type: 'page', item })
            continue
        }

        let pages = chapters.get(item.chapter)
        if (!pages) {
            pages = []
            chapters.set(item.chapter, pages)
            groups.push({ type: 'chapter', chapter: item.chapter, items: pages })
        }
        pages.push(item)
    }

    return groups
}

/** Each section with pages, under its label, in the order of `sections`. */
function groupBySection(items: DocsNavItem[], sections: { key: string; label: string }[]): DocsNavGroup[] {
    return sections.flatMap(({ key, label }) => {
        const own = items.filter((item) => item.section === key)
        return own.length > 0 ? [{ type: 'section' as const, section: key, label, entries: groupByChapter(own) }] : []
    })
}

/** The navigation seen from one page of `tree`: every group, the page marked
 *  active, and its neighbours. */
export function buildDocsNavigation(
    tree: DocsTree,
    currentId: string,
    sections: { key: string; label: string }[] = [],
): DocsNavigation {
    const position = tree.byId.get(currentId)?.index ?? -1
    const items = tree.pages.map((page): DocsNavItem => ({
        title: page.label,
        section: page.section,
        chapter: page.chapter,
        href: page.href,
        isActive: page.index === position,
    }))

    return {
        groups:
            sections.length > 0
                ? [...groupByChapter(items.filter((item) => !item.section)), ...groupBySection(items, sections)]
                : groupByChapter(items),
        previousPage: position > 0 ? items[position - 1] : null,
        nextPage: position >= 0 && position < items.length - 1 ? items[position + 1] : null,
    }
}
