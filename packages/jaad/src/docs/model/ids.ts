import { posix } from 'node:path'
import { ucfirst } from '@jaamd/site/helpers.ts'
import { slug as githubSlug } from 'github-slugger'

/** A numeric order prefix, e.g. "01-" or "123-". */
const NUMBERED_PREFIX_RE = /^(\d+)-(.+)$/

/** What a page's path says: its file order, its chapter and its own name. */
export interface ParsedDocPath {
    /** The file name without its order prefix. */
    slug: string
    order: number
    /** The chapter directory without its order prefix. */
    chapter?: string
    orderChapter?: number
}

export function parseDocPath(path: string): ParsedDocPath {
    const parts = path.split('/')
    const name = NUMBERED_PREFIX_RE.exec(parts[parts.length - 1])
    const directory = parts.length >= 2 ? parts[parts.length - 2] : undefined
    const chapter = directory ? NUMBERED_PREFIX_RE.exec(directory) : null

    return {
        slug: name ? name[2] : parts[parts.length - 1],
        order: name ? parseInt(name[1], 10) : 999,
        chapter: chapter ? chapter[2] : directory,
        orderChapter: chapter ? parseInt(chapter[1], 10) : undefined,
    }
}

/** "01-chapter/02-section" → "chapter/section" */
export function getCleanSlug(id: string): string {
    return id
        .split('/')
        .map((part) => {
            return part.replace(NUMBERED_PREFIX_RE, '$2')
        })
        .join('/')
}

/** A page's named url below the docs mount: its section, then its clean path. */
export function namedSlug(path: string, section?: string): string {
    const slug = getCleanSlug(path)
    return section ? `${section}/${slug}` : slug
}

/** "it/02-guides/01-setup" becomes locale "it" and "02-guides/01-setup". */
export function splitDocLocale(id: string, locales: string[]): { locale: string | null; id: string } {
    const slash = id.indexOf('/')
    if (slash === -1) {
        return { locale: null, id }
    }

    const first = id.slice(0, slash)
    if (!locales.includes(first)) {
        return { locale: null, id }
    }
    return { locale: first, id: id.slice(slash + 1) }
}

/** Match the ids produced by Astro's glob loader, independently of the OS. */
export function getDocCollectionId(filePath: string): string {
    return filePath
        .replace(/\.md$/, '')
        .split(/[\\/]/)
        .map((part) => {
            return githubSlug(part)
        })
        .join('/')
}

/** The collection holding the docs, or the pages of one section. */
export function collectionName(section?: string): string {
    return section ? `docsPages-${section}` : 'docsPages'
}

/** The id of a file given relative to its docs directory: its locale, the
 *  section that directory is, then its path. */
export function collectionIdFor(filePath: string, section: string | undefined, locales: string[]): string {
    const { locale, id } = splitDocLocale(getDocCollectionId(filePath), locales)
    return [locale, section, id].filter(Boolean).join('/')
}

/** "getting-started" → "Getting Started". */
export function slugToTitle(slug: string): string {
    return slug
        .split(/[-_]+/)
        .map((word) => {
            return ucfirst(word)
        })
        .join(' ')
}

export function formatChapterTitle(chapter: string | undefined): string | null {
    if (!chapter) {
        return null
    }
    return slugToTitle(chapter)
}

/**
 * A page's file below its docs directory, for the edit link. `filePath` is what
 * Astro's glob loader records, relative to the project; ids are slugged, so
 * `FAQ.md` would come back as `faq`. `fallback`, the id path, serves when the
 * loader records no file or the file sits outside `dir`.
 */
export function editPathFor(filePath: string | undefined, dir: string, fallback: string): string {
    const guess = `${fallback}.md`
    if (!filePath) {
        return guess
    }

    const file = posix.normalize(filePath.replaceAll('\\', '/'))
    const root = posix.normalize(dir.replaceAll('\\', '/')).replace(/\/+$/, '')
    if (root === '.') {
        return file
    }
    return file.startsWith(`${root}/`) ? file.slice(root.length + 1) : guess
}
