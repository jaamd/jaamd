import type { DocsSourceEntry } from './collection.ts'
import type { MarkdownExportContext } from './markdown-export.ts'
import type { DocsPage } from './model/tree.ts'
import config from 'virtual:jaad/config'
import { DEFAULT_LOCALE, LOCALES, buildLocales } from '../site/runtime.ts'
import { getDocsTree, getServedLocales } from './collection.ts'
import { exportMarkdown, sourceKey } from './markdown-export.ts'
import { slugToTitle } from './model/ids.ts'
import { pageDescription } from './model/rendered.ts'
import { SECTIONS, docsUrls } from './runtime.ts'
import { buildSearchIndex } from './search-index.ts'
import { docsFileHref, docsMarkdownHref } from './urls.ts'

export async function searchIndexResponse(locale?: string): Promise<Response> {
    const index = buildSearchIndex(await getDocsTree(locale), SECTIONS)

    return new Response(JSON.stringify(index), {
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
    })
}

/** An href made absolute when the site's url is known. */
const absolute = (href: string, site: URL | undefined): string => (site ? new URL(href, site.origin).href : href)

let exportContext: Promise<MarkdownExportContext> | undefined

/** Where every page's Markdown is, in every locale. Built once per build: in
 *  dev, pages come and go, so it is built afresh each time. */
function markdownContext(site: URL | undefined): Promise<MarkdownExportContext> {
    const build = async (): Promise<MarkdownExportContext> => {
        const markdownUrls = new Map<string, string>()
        for (const locale of buildLocales()) {
            const { pages } = await getDocsTree(locale)
            for (const page of pages) {
                if (!page.source.filePath) continue
                const href = docsMarkdownHref(page.slug, docsUrls(page.locale ?? locale))
                markdownUrls.set(sourceKey(page.source.filePath), absolute(href, site))
            }
        }
        return { markdownUrls, origin: site ? site.origin : null }
    }

    if (!import.meta.env.PROD) return build()
    exportContext ??= build()
    return exportContext
}

/** A page as Markdown that reads on its own. */
export async function pageMarkdown(page: DocsPage<DocsSourceEntry>, site: URL | undefined): Promise<string> {
    return exportMarkdown(
        {
            title: page.title,
            description: page.data.description,
            body: page.source.body ?? '',
            filePath: page.source.filePath,
        },
        await markdownContext(site),
    )
}

/** Every page of a locale in one file, in the order of the site. */
export async function llmsFullResponse(site: URL | undefined, locale?: string): Promise<Response> {
    const { pages } = await getDocsTree(locale)
    const parts = await Promise.all(
        pages.map(async (page) => {
            const source = absolute(docsMarkdownHref(page.slug, docsUrls(locale)), site)
            return `${(await pageMarkdown(page, site)).trimEnd()}\n\nSource: ${source}`
        }),
    )

    return new Response(parts.join('\n\n---\n\n') + '\n', {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
}

/** Text that cannot close the brackets of a Markdown link. */
const linkText = (text: string): string => text.replace(/[\\[\]]/g, '\\$&')

interface Row {
    title: string
    slug: string
    description: string | null
}

/** Plain-text index of every page, per the llms.txt convention. */
export async function llmsResponse(site: URL | undefined, locale?: string): Promise<Response> {
    const { pages: sortedPages } = await getDocsTree(locale)

    const markdownHref = (slug: string): string => absolute(docsMarkdownHref(slug, docsUrls(locale)), site)

    const toLine = (row: Row): string =>
        `- [${linkText(row.title)}](${markdownHref(row.slug)})${row.description ? `: ${row.description}` : ''}`

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
                ([chapter, rows]) => `${heading} ${slugToTitle(chapter)}\n\n${rows.map(toLine).join('\n')}`,
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

    // The default language's file points at the others.
    const others = (locale ?? DEFAULT_LOCALE) === DEFAULT_LOCALE ? await getServedLocales() : []
    const languages =
        others.length > 0
            ? [
                  '## Other languages',
                  others
                      .map((code) => {
                          const name = LOCALES.find((known) => known.code === code)?.name ?? code
                          const href = absolute(docsFileHref('llms.txt', docsUrls(code)), site)
                          return `- [${linkText(name)}](${href})`
                      })
                      .join('\n'),
              ]
            : []

    const content = [
        `# ${config.title}`,
        ...(config.description ? [`> ${config.description}`] : []),
        ...sections,
        ...languages,
    ].join('\n\n')

    return new Response(content + '\n', {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
}
