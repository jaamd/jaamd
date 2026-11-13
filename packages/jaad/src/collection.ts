import type { DocsEntry } from './@types/docs.ts'
import type { Locale } from './locales.ts'
import { getCollection } from 'astro:content'
import { DEFAULT_LOCALE, LOCALES, SECTIONS, docsUrls, prefixedCodes } from './docs-config.ts'
import { docsPageHref } from './urls.ts'
import {
    docTranslationKey,
    collectionName,
    getCanonicalDocSlug,
    sortDocPages,
    splitDocLocale,
    splitDocSection,
    validateDocsStructure,
} from './utils/docs.ts'

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

/** Attaches the locale, the section and the id routing reads, leaving `id` the
 *  collection id. */
function localise(page: DocsEntry): DocsEntry {
    if (CODES.length === 0 && KEYS.length === 0) return page
    const { locale, id } = splitDocLocale(page.id, CODES)
    const split = splitDocSection(id, KEYS)
    return {
        ...page,
        locale: locale ?? undefined,
        localeId: split.id,
        section: split.section ?? undefined,
        sectionOrder: split.section ? KEYS.indexOf(split.section) : undefined,
    }
}

/** The pages of one locale, or every page when the docs are not localised.
 *  Cached in production only: in dev the module would go stale on edit. */
export async function getSortedDocsPages(locale: string = DEFAULT_LOCALE): Promise<DocsEntry[]> {
    const key = CODES.length > 0 ? locale : ''
    const hit = cached.get(key)
    if (import.meta.env.PROD && hit) return hit

    const names = KEYS.length > 0 ? KEYS.map((section) => collectionName(section)) : [collectionName()]
    const collections = await Promise.all(names.map((name) => getCollection(name as 'docsPages')))
    const pages = (collections.flat() as unknown as DocsEntry[])
        .map(localise)
        .filter((page) => key === '' || page.locale === key)

    // Validated before drafts are dropped, so a draft's slug conflict is an error.
    validateDocsStructure(pages, key || undefined)
    const sorted = sortDocPages(import.meta.env.PROD ? pages.filter((page) => !page.data.draft) : pages)
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
        return [{ key, label, href: docsPageHref(getCanonicalDocSlug(pages[index], index, pages), urls) }]
    })
}

export interface LocaleAlternate {
    locale: Locale
    href: string
    /** False when this locale has no such page and the href is its opening one. */
    translated: boolean
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
            href: docsPageHref(match ? getCanonicalDocSlug(match, index, pages) : '', docsUrls(locale.code)),
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
