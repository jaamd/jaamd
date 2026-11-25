import type { DocsPageData } from '../types.ts'
import type { DocsUrlOptions } from '../urls.ts'
import type { RenderedMarkdown } from '@jaamd/site/rendered.ts'
import { renderedTitle } from '@jaamd/site/rendered.ts'
import { docsPageHref } from '../urls.ts'
import { namedSlug, parseDocPath, slugToTitle } from './ids.ts'

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

/** The directory a page sits in, below its section and locale; empty at the root. */
function directoryOf(path: string): string {
    const slash = path.lastIndexOf('/')
    return slash === -1 ? '' : path.slice(0, slash)
}

/**
 * The order of `sections` first, then chapter order, then file order within
 * the chapter. Frontmatter `order` replaces a file's prefix number; root pages
 * interleave with chapters by their own number. A chapter without a prefix
 * number takes its first page's, so its pages stay together. Ties fall to the
 * directory, then the path, so the order never depends on how the files were
 * read.
 */
function sortSources<S extends DocsSource>(sources: S[], sections: string[]): S[] {
    const entries = sources.map((source) => {
        const parsed = parseDocPath(source.path)
        return {
            source,
            parsed,
            section: sections.indexOf(source.section ?? ''),
            directory: directoryOf(source.path),
            order: source.data.order ?? parsed.order,
        }
    })

    // The first page of each unnumbered chapter, by section and directory.
    const firstOrder = new Map<string, number>()
    for (const entry of entries) {
        if (!entry.parsed.chapter || entry.parsed.orderChapter !== undefined) {
            continue
        }
        const key = `${entry.section}/${entry.directory}`
        firstOrder.set(key, Math.min(firstOrder.get(key) ?? Infinity, entry.order))
    }

    const primary = (entry: (typeof entries)[number]): number => {
        if (entry.parsed.orderChapter !== undefined) {
            return entry.parsed.orderChapter
        }
        return entry.parsed.chapter ? firstOrder.get(`${entry.section}/${entry.directory}`)! : entry.order
    }

    return entries
        .toSorted((a, b) => {
            return (
                a.section - b.section ||
                primary(a) - primary(b) ||
                a.directory.localeCompare(b.directory) ||
                a.order - b.order ||
                a.source.path.localeCompare(b.source.path)
            )
        })
        .map((entry) => {
            return entry.source
        })
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
        byId: new Map(
            pages.map((page) => {
                return [page.id, page]
            }),
        ),
        byKey: new Map(
            pages.map((page) => {
                return [page.translationKey, page]
            }),
        ),
    }
}
