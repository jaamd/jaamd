import type { DocsNavItem } from './types.ts'
import { docCanonicalSlug, docLabel, docPath, parseDocCollectionId, type DocsPageLike } from './pages.ts'
import { docsPageHref, type DocsUrlOptions } from './urls.ts'

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

/** Build every navigation view from one ordered collection traversal. */
interface Model {
    items: DocsNavItem[]
    positions: Map<string, number>
}

// Only isActive and the neighbours vary between the pages of one locale. The
// hrefs do not, as long as the url options are the same ones.
const models = new WeakMap<object, Map<string, Model>>()

function modelFor(sortedPages: DocsPageLike[], urls: DocsUrlOptions): Model {
    const key = `${urls.docsBase}\u0000${urls.deploymentBase ?? ''}\u0000${urls.locale ?? ''}\u0000${urls.defaultLocale ?? ''}`
    let byUrls = models.get(sortedPages)
    if (!byUrls) {
        byUrls = new Map()
        models.set(sortedPages, byUrls)
    }
    const cached = byUrls.get(key)
    if (cached) return cached

    const model: Model = {
        items: sortedPages.map((page, index): DocsNavItem => ({
            title: docLabel(page),
            section: page.section,
            chapter: parseDocCollectionId(docPath(page)).chapter,
            href: docsPageHref(docCanonicalSlug(page, index, sortedPages), urls),
            isActive: false,
        })),
        positions: new Map(sortedPages.map((page, index) => [page.id, index])),
    }

    byUrls.set(key, model)
    return model
}

/** Each section with pages, under its label, in the order of `sections`. */
function groupBySection(items: DocsNavItem[], sections: { key: string; label: string }[]): DocsNavGroup[] {
    return sections.flatMap(({ key, label }) => {
        const own = items.filter((item) => item.section === key)
        return own.length > 0 ? [{ type: 'section' as const, section: key, label, entries: groupByChapter(own) }] : []
    })
}

export function buildDocsNavigation(
    sortedPages: DocsPageLike[],
    currentId: string,
    urls: DocsUrlOptions,
    sections: { key: string; label: string }[] = [],
): DocsNavigation {
    const { items, positions } = modelFor(sortedPages, urls)
    const position = positions.get(currentId) ?? -1
    const marked = items.map((item, index) => ({ ...item, isActive: index === position }))

    return {
        groups:
            sections.length > 0
                ? [...groupByChapter(marked.filter((item) => !item.section)), ...groupBySection(marked, sections)]
                : groupByChapter(marked),
        previousPage: position > 0 ? marked[position - 1] : null,
        nextPage: position >= 0 && position < marked.length - 1 ? marked[position + 1] : null,
    }
}
