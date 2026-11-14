import type { SearchIndex } from '../site/search.ts'
import type { DocsSection } from './config.ts'
import {
    docCanonicalSlug,
    docPath,
    docTitle,
    formatChapterTitle,
    parseDocCollectionId,
    splitMarkdownByHeadings,
    stripMarkdown,
    type DocsPageLike,
} from './pages.ts'
import { docsPageHref, type DocsUrlOptions } from './urls.ts'

/** One entry per h2 and h3 of every page, plus one for the text before them. */
export function buildSearchIndex(
    sortedPages: DocsPageLike[],
    sections: Pick<DocsSection, 'key' | 'label'>[],
    urls: DocsUrlOptions,
): SearchIndex {
    const index: SearchIndex = {
        sections: sections
            .filter(({ key }) => sortedPages.some((page) => page.section === key))
            .map(({ key, label }) => ({ key, label })),
        pages: [],
        entries: [],
    }

    sortedPages.forEach((page, at) => {
        const chapter = formatChapterTitle(parseDocCollectionId(docPath(page)).chapter)
        const keywords = page.data?.keywords ?? []
        index.pages.push({
            title: docTitle(page),
            href: docsPageHref(docCanonicalSlug(page, at, sortedPages), urls),
            ...(page.section ? { section: page.section } : {}),
            ...(chapter ? { chapter } : {}),
            ...(keywords.length > 0 ? { keywords } : {}),
        })

        for (const { heading, markdown } of splitMarkdownByHeadings(page.body ?? '')) {
            // Drops table pipes and rules.
            const text = stripMarkdown(markdown)
                .replace(/\||:?-{3,}:?/g, ' ')
                .replace(/\s+/g, ' ')
                .trim()
            if (!heading && !text) continue
            index.entries.push({
                page: at,
                ...(heading ? { heading: stripMarkdown(heading.text), anchor: heading.slug } : {}),
                text,
            })
        }
    })

    return index
}
