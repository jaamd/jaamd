import type { LocaleAlternate } from '../site/locales.ts'
import type { DocsEntry } from './types.ts'
import { getCollection } from 'astro:content'
import config from 'virtual:jaad/config'
import { DEFAULT_LOCALE, LOCALES, prefixedCodes } from '../site/runtime.ts'
import {
    collectionName,
    docCanonicalSlug,
    docTranslationKey,
    sortDocPages,
    splitDocLocale,
    validateDocsStructure,
} from './pages.ts'
import { SECTIONS, docsUrls } from './runtime.ts'
import { docsPageHref } from './urls.ts'

const cached = new Map<string, DocsEntry[]>()
// Keyed on the array: the same object in production, a fresh one in dev.
const keyIndex = new WeakMap<DocsEntry[], Map<string, number>>()

function indexOfKey(pages: DocsEntry[], key: string): number {
    let index = keyIndex.get(pages)
    if (!index) {
        index = new Map(pages.map((page, at) => [docTranslationKey(page), at]))
        keyIndex.set(pages, index)
    }
    return index.get(key) ?? -1
}

const CODES = LOCALES.map((locale) => locale.code)

const KEYS = SECTIONS.map((section) => section.key)

/** Attaches the locale, the section and the path, leaving `id` the collection id. */
function place(page: DocsEntry, section?: string): DocsEntry {
    const { locale, id } = splitDocLocale(page.id, CODES)
    return {
        ...page,
        locale: locale ?? undefined,
        section,
        path: section ? id.slice(section.length + 1) : id,
    }
}

/** The pages of one locale, or every page when the docs are not localised.
 *  Cached in production only: in dev the module would go stale on edit. */
export async function getSortedDocsPages(locale: string = DEFAULT_LOCALE): Promise<DocsEntry[]> {
    const key = CODES.length > 0 ? locale : ''
    const hit = cached.get(key)
    if (import.meta.env.PROD && hit) return hit

    // `docsDir` when in use, then one collection per section.
    const sections = [...(config.docs.dirInUse ? [undefined] : []), ...KEYS]
    const collections = await Promise.all(
        sections.map(async (section) => {
            const entries = await getCollection(collectionName(section) as 'docsPages')
            return (entries as unknown as DocsEntry[]).map((page) => place(page, section))
        }),
    )
    const pages = collections.flat().filter((page) => key === '' || page.locale === key)

    // Validated before drafts are dropped, so a draft's slug conflict is an error.
    validateDocsStructure(pages, key || undefined)
    const sorted = sortDocPages(import.meta.env.PROD ? pages.filter((page) => !page.data.draft) : pages, KEYS)
    if (import.meta.env.PROD) cached.set(key, sorted)
    return sorted
}

export interface SectionLink {
    key: string
    label: string
    href: string
}

/** The sections with something to serve in a locale, each at the url of its
 *  first page. */
export async function getSectionLinks(locale: string = DEFAULT_LOCALE): Promise<SectionLink[]> {
    const pages = await getSortedDocsPages(locale)
    const urls = docsUrls(locale)

    return SECTIONS.flatMap(({ key, label }) => {
        const index = pages.findIndex((page) => page.section === key)
        if (index === -1) return []
        return [{ key, label, href: docsPageHref(docCanonicalSlug(pages[index], index, pages), urls) }]
    })
}

/** Where a page lives in every locale, paired by `translationKey` or by slug.
 *  An untranslated page falls back to that locale's opening page. Empty asks
 *  for the opening pages themselves. */
export async function getLocaleAlternates(key: string): Promise<LocaleAlternate[]> {
    const alternates: LocaleAlternate[] = []

    for (const locale of LOCALES) {
        const pages = await getSortedDocsPages(locale.code)
        // Every page drafted leaves a locale with nothing to link to.
        if (pages.length === 0) continue

        const index = key ? indexOfKey(pages, key) : 0
        const match = index >= 0 ? pages[index] : undefined

        alternates.push({
            locale,
            translated: Boolean(match),
            href: docsPageHref(match ? docCanonicalSlug(match, index, pages) : '', docsUrls(locale.code)),
        })
    }

    return alternates
}

/** The prefixed locales that have something to serve. */
export async function getServedLocales(): Promise<string[]> {
    const served: string[] = []

    for (const code of prefixedCodes()) {
        const pages = await getSortedDocsPages(code)
        if (pages.length > 0) served.push(code)
    }

    return served
}
