import type { DocsNavItem } from './@types/docs.ts'
import { docsPageHref, type DocsUrlOptions } from './urls.ts'
import { docLabel, getCanonicalDocSlug, parseDocCollectionId, routedId, type DocsPageLike } from './utils/docs.ts'

export type NavGroup =
    | { type: 'page'; order: number; item: DocsNavItem }
    | { type: 'chapter'; order: number; chapter: string; items: DocsNavItem[] }

export interface DocsNavigation {
    /** Top-level pages and chapters of the current section, or of the whole tree. */
    groups: NavGroup[]
    previousPage: DocsNavItem | null
    nextPage: DocsNavItem | null
}

function groupByChapter(items: DocsNavItem[]): NavGroup[] {
    const chapters = new Map<string, Extract<NavGroup, { type: 'chapter' }>>()
    const groups: NavGroup[] = []

    for (const item of items) {
        if (!item.chapter) {
            groups.push({ type: 'page', order: item.primaryOrder, item })
            continue
        }

        let chapter = chapters.get(item.chapter)
        if (!chapter) {
            chapter = {
                type: 'chapter',
                order: item.primaryOrder,
                chapter: item.chapter,
                items: [],
            }
            chapters.set(item.chapter, chapter)
            groups.push(chapter)
        }
        chapter.items.push(item)
    }

    return groups.toSorted((a, b) => a.order - b.order)
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
        items: sortedPages.map((page, index): DocsNavItem => {
            const parsed = parseDocCollectionId(routedId(page))
            return {
                title: docLabel(page),
                section: page.section,
                chapter: parsed.chapter,
                primaryOrder: parsed.orderChapter ?? page.data?.order ?? parsed.order,
                href: docsPageHref(getCanonicalDocSlug(page, index, sortedPages), urls),
                isActive: false,
            }
        }),
        positions: new Map(sortedPages.map((page, index) => [page.id, index])),
    }

    byUrls.set(key, model)
    return model
}

export function buildDocsNavigation(
    sortedPages: DocsPageLike[],
    currentId: string,
    urls: DocsUrlOptions,
): DocsNavigation {
    const { items, positions } = modelFor(sortedPages, urls)
    const currentIndex = positions.get(currentId) ?? -1
    const section = items[currentIndex]?.section
    // Navigation stays inside the section the page belongs to.
    const marked = items
        .map((item, index) => ({ ...item, isActive: index === currentIndex }))
        .filter((item) => item.section === section)
    const position = marked.findIndex((item) => item.isActive)

    return {
        groups: groupByChapter(marked),
        previousPage: position > 0 ? marked[position - 1] : null,
        nextPage: position >= 0 && position < marked.length - 1 ? marked[position + 1] : null,
    }
}
