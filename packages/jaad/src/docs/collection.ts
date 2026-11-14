import type { LocaleAlternate } from '../site/locales.ts'
import type { DocsSource, DocsTree } from './model/tree.ts'
import type { DocsEntry } from './types.ts'
import { getCollection } from 'astro:content'
import config from 'virtual:jaad/config'
import { DEFAULT_LOCALE, LOCALES, prefixedCodes } from '../site/runtime.ts'
import { collectionName, splitDocLocale } from './model/ids.ts'
import { buildDocsTree } from './model/tree.ts'
import { validateDocsStructure } from './model/validate.ts'
import { SECTIONS, docsUrls } from './runtime.ts'
import { docsPageHref } from './urls.ts'

/** A collection entry, placed in its locale and section. */
export type DocsSourceEntry = DocsEntry & DocsSource

const cached = new Map<string, DocsTree<DocsSourceEntry>>()

const CODES = LOCALES.map((locale) => locale.code)

const KEYS = SECTIONS.map((section) => section.key)

/** Attaches the locale, the section and the path, leaving `id` the collection id. */
function place(entry: DocsEntry, section?: string): DocsSourceEntry {
    const { locale, id } = splitDocLocale(entry.id, CODES)
    return {
        ...entry,
        locale: locale ?? undefined,
        section,
        path: section ? id.slice(section.length + 1) : id,
    }
}

/** The pages of one locale, or every page when the docs are not localised.
 *  Cached in production only: in dev the module would go stale on edit. */
export async function getDocsTree(locale: string = DEFAULT_LOCALE): Promise<DocsTree<DocsSourceEntry>> {
    const key = CODES.length > 0 ? locale : ''
    const hit = cached.get(key)
    if (import.meta.env.PROD && hit) return hit

    // `docsDir` when in use, then one collection per section.
    const sections = [...(config.docs.dirInUse ? [undefined] : []), ...KEYS]
    const collections = await Promise.all(
        sections.map(async (section) => {
            const entries = await getCollection(collectionName(section) as 'docsPages')
            return (entries as unknown as DocsEntry[]).map((entry) => place(entry, section))
        }),
    )
    const sources = collections.flat().filter((source) => key === '' || source.locale === key)

    // Validated before drafts are dropped, so a draft's slug conflict is an error.
    validateDocsStructure(sources, key || undefined)
    const tree = buildDocsTree(import.meta.env.PROD ? sources.filter((source) => !source.data.draft) : sources, {
        sections: KEYS,
        urls: docsUrls(locale),
    })
    if (import.meta.env.PROD) cached.set(key, tree)
    return tree
}

export interface SectionLink {
    key: string
    label: string
    href: string
}

/** The sections with something to serve in a locale, each at the url of its
 *  first page. */
export async function getSectionLinks(locale: string = DEFAULT_LOCALE): Promise<SectionLink[]> {
    const { pages } = await getDocsTree(locale)

    return SECTIONS.flatMap(({ key, label }) => {
        const first = pages.find((page) => page.section === key)
        return first ? [{ key, label, href: first.href }] : []
    })
}

/** Where a page lives in every locale, paired by `translationKey` or by slug.
 *  An untranslated page falls back to that locale's opening page. Empty asks
 *  for the opening pages themselves. */
export async function getLocaleAlternates(key: string): Promise<LocaleAlternate[]> {
    const alternates: LocaleAlternate[] = []

    for (const locale of LOCALES) {
        const tree = await getDocsTree(locale.code)
        // Every page drafted leaves a locale with nothing to link to.
        if (tree.pages.length === 0) continue

        const match = key ? tree.byKey.get(key) : tree.pages[0]
        alternates.push({
            locale,
            translated: Boolean(match),
            href: match ? match.href : docsPageHref('', docsUrls(locale.code)),
        })
    }

    return alternates
}

/** The prefixed locales that have something to serve. */
export async function getServedLocales(): Promise<string[]> {
    const served: string[] = []

    for (const code of prefixedCodes()) {
        const { pages } = await getDocsTree(code)
        if (pages.length > 0) served.push(code)
    }

    return served
}
