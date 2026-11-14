import type { SearchIndex } from '../site/search.ts'
import type { DocsSection } from './config.ts'
import type { DocsTree } from './model/tree.ts'
import { formatChapterTitle } from './model/ids.ts'
import { pageChunks } from './model/rendered.ts'

/** One entry per h2 and h3 of every page, plus one for the text before them. */
export function buildSearchIndex(tree: DocsTree, sections: Pick<DocsSection, 'key' | 'label'>[]): SearchIndex {
    const index: SearchIndex = {
        sections: sections
            .filter(({ key }) => tree.pages.some((page) => page.section === key))
            .map(({ key, label }) => ({ key, label })),
        pages: [],
        entries: [],
    }

    for (const page of tree.pages) {
        const chapter = formatChapterTitle(page.chapter)
        const keywords = page.data.keywords ?? []
        index.pages.push({
            title: page.title,
            href: page.href,
            ...(page.section ? { section: page.section } : {}),
            ...(chapter ? { chapter } : {}),
            ...(keywords.length > 0 ? { keywords } : {}),
        })

        for (const { heading, text } of pageChunks(page.source.rendered)) {
            if (!heading && !text) continue
            index.entries.push({
                page: page.index,
                ...(heading ? { heading: heading.text, anchor: heading.slug } : {}),
                text,
            })
        }
    }

    return index
}
