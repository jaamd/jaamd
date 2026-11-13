import config from 'virtual:jaad/config'
import { getSortedDocsPages } from '../collection.ts'
import { SECTIONS, docsUrls } from '../docs-config.ts'
import { docsMarkdownHref } from '../urls.ts'
import { docTitle, extractDescription, formatChapterTitle, docSlug, parseDocCollectionId, docPath } from './docs.ts'
import { buildSearchIndex } from './search-index.ts'

export async function searchIndexResponse(locale?: string): Promise<Response> {
    const index = buildSearchIndex(await getSortedDocsPages(locale), SECTIONS, docsUrls(locale))

    return new Response(JSON.stringify(index), {
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
    })
}

interface Row {
    title: string
    slug: string
    description: string | null
}

/** Plain-text index of every page, per the llms.txt convention. */
export async function llmsResponse(site: URL | undefined, locale?: string): Promise<Response> {
    const sortedPages = await getSortedDocsPages(locale)

    const markdownHref = (slug: string): string => {
        const href = docsMarkdownHref(slug, docsUrls(locale))
        return site ? new URL(href, site.origin).href : href
    }

    const toLine = (row: Row): string =>
        `- [${row.title}](${markdownHref(row.slug)})${row.description ? `: ${row.description}` : ''}`

    /** Standalone pages first, then one heading per chapter. */
    const outline = (pages: typeof sortedPages, heading: string): string[] => {
        const standalone: Row[] = []
        const chapters = new Map<string, Row[]>()

        for (const page of pages) {
            const { chapter } = parseDocCollectionId(docPath(page))
            const title = docTitle(page)
            const row: Row = {
                title,
                slug: docSlug(page),
                description: page.data.description ?? extractDescription(page.body || '', title),
            }

            if (!chapter) {
                standalone.push(row)
                continue
            }

            const rows = chapters.get(chapter) ?? []
            if (rows.length === 0) chapters.set(chapter, rows)
            rows.push(row)
        }

        return [
            ...(standalone.length > 0 ? [standalone.map(toLine).join('\n')] : []),
            ...[...chapters].map(
                ([chapter, rows]) =>
                    `${heading} ${formatChapterTitle(chapter) ?? chapter}\n\n${rows.map(toLine).join('\n')}`,
            ),
        ]
    }

    // With sections, the pages outside them come first; each section is a
    // heading, and its chapters sit one level below.
    const loose = sortedPages.filter((page) => !page.section)
    const sections: string[] =
        SECTIONS.length === 0
            ? outline(sortedPages, '##')
            : [
                  ...(loose.length > 0 ? outline(loose, '##') : []),
                  ...SECTIONS.flatMap((section) => {
                      const pages = sortedPages.filter((page) => page.section === section.key)
                      return pages.length > 0 ? [`## ${section.label}`, ...outline(pages, '###')] : []
                  }),
              ]

    const content = [`# ${config.title}`, ...(config.description ? [`> ${config.description}`] : []), ...sections].join(
        '\n\n',
    )

    return new Response(content + '\n', {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
}
