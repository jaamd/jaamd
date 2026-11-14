import type { DocsPage } from './model/tree.ts'
import config from 'virtual:jaad/config'
import { getDocsTree } from './collection.ts'
import { formatChapterTitle } from './model/ids.ts'
import { pageDescription } from './model/rendered.ts'
import { SECTIONS, docsUrls } from './runtime.ts'
import { buildSearchIndex } from './search-index.ts'
import { docsMarkdownHref } from './urls.ts'

export async function searchIndexResponse(locale?: string): Promise<Response> {
    const index = buildSearchIndex(await getDocsTree(locale), SECTIONS)

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
    const { pages: sortedPages } = await getDocsTree(locale)

    const markdownHref = (slug: string): string => {
        const href = docsMarkdownHref(slug, docsUrls(locale))
        return site ? new URL(href, site.origin).href : href
    }

    const toLine = (row: Row): string =>
        `- [${row.title}](${markdownHref(row.slug)})${row.description ? `: ${row.description}` : ''}`

    /** Standalone pages first, then one heading per chapter. */
    const outline = (pages: DocsPage[], heading: string): string[] => {
        const standalone: Row[] = []
        const chapters = new Map<string, Row[]>()

        for (const page of pages) {
            const { chapter, title } = page
            const row: Row = {
                title,
                slug: page.slug,
                description: page.data.description ?? pageDescription(page.source.rendered, title),
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
