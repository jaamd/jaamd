import type { DocsPageData } from '../types.ts'
import type { DocsUrlOptions } from '../urls.ts'
import type { RenderedMarkdown } from './rendered.ts'
import { docsPageHref } from '../urls.ts'
import { namedSlug, parseDocPath, slugToTitle } from './ids.ts'
import { renderedTitle } from './rendered.ts'

/** A markdown file of one locale: a collection entry, or a file read from disk. */
export interface DocsSource {
    /** Collection id. */
    id: string
    /** The id without its locale and its section. */
    path: string
    /** Set when the docs are localised. */
    locale?: string
    /** Set when the docs are split into sections. */
    section?: string
    data: Partial<DocsPageData>
    rendered?: RenderedMarkdown
}

/** A page with everything its file, its frontmatter and its place in the docs decide. */
export interface DocsPage<S extends DocsSource = DocsSource> {
    /** What the page was built from. */
    source: S
    id: string
    path: string
    locale?: string
    section?: string
    /** The chapter directory, without its order prefix. */
    chapter?: string
    data: S['data']
    /** The named url below the docs mount: its section, then its clean path. */
    slug: string
    /** Where it is served: empty for the opening page, the section for the first
     *  page of a later one, `slug` otherwise. */
    canonical: string
    /** The other slugs it answers to, each redirecting to `canonical`. */
    aliases: string[]
    /** The url of `canonical`. */
    href: string
    /** Frontmatter title, then the first h1, then the file name. */
    title: string
    /** The name in navigation: frontmatter `label`, then `title`. */
    label: string
    /** What pairs it with its translations: frontmatter `translationKey`, then `slug`. */
    translationKey: string
    /** Position in reading order. */
    index: number
}

/** The pages of one locale in reading order. */
export interface DocsTree<S extends DocsSource = DocsSource> {
    pages: DocsPage<S>[]
    byId: Map<string, DocsPage<S>>
    byKey: Map<string, DocsPage<S>>
}

export interface DocsTreeOptions {
    /** Section keys, in their order. */
    sections?: string[]
    /** For `href`. */
    urls: DocsUrlOptions
}

/** The order of `sections` first, then chapter order, then file order within
 *  the chapter. Frontmatter `order` replaces a file's prefix number; root pages
 *  interleave with chapters by their own number. */
function sortSources<S extends DocsSource>(sources: S[], sections: string[]): S[] {
    return sources
        .map((source) => {
            const parsed = parseDocPath(source.path)
            const order = source.data.order ?? parsed.order
            return {
                source,
                section: sections.indexOf(source.section ?? ''),
                primary: parsed.orderChapter ?? order,
                secondary: order,
            }
        })
        .toSorted((a, b) => a.section - b.section || a.primary - b.primary || a.secondary - b.secondary)
        .map((entry) => entry.source)
}

/** Resolves every page of one locale once. */
export function buildDocsTree<S extends DocsSource>(sources: S[], options: DocsTreeOptions): DocsTree<S> {
    const sorted = sortSources(sources, options.sections ?? [])

    const pages = sorted.map((source, index): DocsPage<S> => {
        const parsed = parseDocPath(source.path)
        const slug = namedSlug(source.path, source.section)
        const canonical =
            index === 0 ? '' : source.section && sorted[index - 1].section !== source.section ? source.section : slug
        const title = source.data.title ?? renderedTitle(source.rendered) ?? slugToTitle(parsed.slug)

        return {
            source,
            id: source.id,
            path: source.path,
            locale: source.locale,
            section: source.section,
            chapter: parsed.chapter,
            data: source.data,
            slug,
            canonical,
            aliases: [
                ...(slug === canonical ? [] : [slug]),
                // The first section's key leads to the opening page.
                ...(index === 0 && source.section ? [source.section] : []),
            ],
            href: docsPageHref(canonical, options.urls),
            title,
            label: source.data.label ?? title,
            translationKey: source.data.translationKey ?? slug,
            index,
        }
    })

    return {
        pages,
        byId: new Map(pages.map((page) => [page.id, page])),
        byKey: new Map(pages.map((page) => [page.translationKey, page])),
    }
}
