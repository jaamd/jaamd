/// <reference path="../env.d.ts" />

import type { DocsSourceEntry } from './collection.ts'
import type { DocsPage } from './model/tree.ts'
import type { FullPage } from '@jaamd/site/llms.ts'
import type { MarkdownExportContext } from '@jaamd/site/markdown-export.ts'
import { absoluteHref, llmsDocument, llmsFullDocument, llmsLine, textResponse } from '@jaamd/site/llms.ts'
import { exportMarkdown, sourceKey } from '@jaamd/site/markdown-export.ts'
import { pageDescription } from '@jaamd/site/rendered.ts'
import { DEFAULT_LOCALE, LOCALES, buildLocales, oncePerBuild } from '@jaamd/site/runtime.ts'
import config from 'virtual:jaad/config'
import { getDocsTree, getServedLocales } from './collection.ts'
import { slugToTitle } from './model/ids.ts'
import { SECTIONS, docsUrls } from './runtime.ts'
import { buildSearchIndex } from './search-index.ts'
import { docsFileHref, docsMarkdownHref } from './urls.ts'

export async function searchIndexResponse(locale?: string): Promise<Response> {
    const index = buildSearchIndex(await getDocsTree(locale), SECTIONS, (page) => {
        return docsMarkdownHref(page.slug, docsUrls(locale))
    })

    return new Response(JSON.stringify(index), {
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
    })
}

/** Where every page's Markdown is, in every locale. */
const markdownContext = oncePerBuild(async (site: URL | undefined): Promise<MarkdownExportContext> => {
    const markdownUrls = new Map<string, string>()
    for (const locale of buildLocales()) {
        const { pages } = await getDocsTree(locale)
        for (const page of pages) {
            if (!page.source.filePath) {
                continue
            }
            const href = docsMarkdownHref(page.slug, docsUrls(page.locale ?? locale))
            markdownUrls.set(sourceKey(page.source.filePath), absoluteHref(href, site))
        }
    }
    return { markdownUrls, origin: site ? site.origin : null }
})

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

/** Every page of a locale as Markdown, in the order of the site. */
async function fullPages(site: URL | undefined, locale?: string): Promise<FullPage[]> {
    const { pages } = await getDocsTree(locale)
    return Promise.all(
        pages.map(async (page) => {
            return {
                markdown: await pageMarkdown(page, site),
                source: absoluteHref(docsMarkdownHref(page.slug, docsUrls(locale)), site),
            }
        }),
    )
}

/** Every page of a locale in one file, in the order of the site. */
export async function llmsFullResponse(site: URL | undefined, locale?: string): Promise<Response> {
    return textResponse(llmsFullDocument(await fullPages(site, locale)))
}

/** The docs' pages in the site's `llms-full.txt`: the default language's. */
export function llmsFullPages(site: URL | undefined): Promise<FullPage[]> {
    return fullPages(site)
}

interface Row {
    title: string
    slug: string
    description: string | null
}

/** The index of every page of a locale, its headings from `level` down. */
async function llmsBlocks(site: URL | undefined, locale: string | undefined, level: number): Promise<string[]> {
    const { pages: sortedPages } = await getDocsTree(locale)
    const top = '#'.repeat(level)
    const below = '#'.repeat(level + 1)

    const markdownHref = (slug: string): string => {
        return absoluteHref(docsMarkdownHref(slug, docsUrls(locale)), site)
    }

    const toLine = (row: Row): string => {
        return llmsLine(row.title, markdownHref(row.slug), row.description)
    }

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

            let rows = chapters.get(chapter)
            if (!rows) {
                rows = []
                chapters.set(chapter, rows)
            }
            rows.push(row)
        }

        return [
            ...(standalone.length > 0 ? [standalone.map(toLine).join('\n')] : []),
            ...[...chapters].map(([chapter, rows]) => {
                return `${heading} ${slugToTitle(chapter)}\n\n${rows.map(toLine).join('\n')}`
            }),
        ]
    }

    // With sections, the pages outside them come first; each section is a
    // heading, and its chapters sit one level below.
    const loose = sortedPages.filter((page) => {
        return !page.section
    })
    const pageBlocks: string[] =
        SECTIONS.length === 0
            ? outline(sortedPages, top)
            : [
                  ...(loose.length > 0 ? outline(loose, top) : []),
                  ...SECTIONS.flatMap((section) => {
                      const pages = sortedPages.filter((page) => {
                          return page.section === section.key
                      })
                      return pages.length > 0 ? [`${top} ${section.label}`, ...outline(pages, below)] : []
                  }),
              ]

    // The default language's file points at the others.
    const others = (locale ?? DEFAULT_LOCALE) === DEFAULT_LOCALE ? await getServedLocales() : []
    const languages =
        others.length > 0
            ? [
                  `${top} Other languages`,
                  others
                      .map((code) => {
                          const name =
                              LOCALES.find((known) => {
                                  return known.code === code
                              })?.name ?? code
                          const href = absoluteHref(docsFileHref('llms.txt', docsUrls(code)), site)
                          return llmsLine(name, href)
                      })
                      .join('\n'),
              ]
            : []

    return [...pageBlocks, ...languages]
}

/** Plain-text index of every page, per the llms.txt convention. */
export async function llmsResponse(site: URL | undefined, locale?: string): Promise<Response> {
    const blocks = await llmsBlocks(site, locale, 2)
    return textResponse(llmsDocument(config.title, config.description, blocks))
}

/** The docs in the site's `llms.txt`: the default language's index, which
 *  points at the others. */
export function llmsSection(site: URL | undefined, level: number): Promise<string[]> {
    return llmsBlocks(site, undefined, level)
}
