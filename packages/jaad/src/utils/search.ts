/** The search index of one locale, as `search-index.json` serves it. */
export interface SearchIndex {
    /** Empty when the docs are not split into sections. */
    sections: { key: string; label: string }[]
    pages: SearchPage[]
    entries: SearchEntry[]
}

export interface SearchPage {
    title: string
    href: string
    section?: string
    /** Display title of the chapter. */
    chapter?: string
    keywords?: string[]
}

/** The text under one heading, or before the first one. */
export interface SearchEntry {
    /** Position in `pages`. */
    page: number
    heading?: string
    anchor?: string
    text: string
}

export interface SearchHit {
    entry: SearchEntry
    href: string
    score: number
}

/** A page and the headings inside it that matched. */
export interface SearchGroup {
    page: SearchPage
    score: number
    /** Set when the text before the first heading matched. */
    intro?: SearchEntry
    hits: SearchHit[]
}

const MAX_GROUPS = 8
const MAX_HITS = 3
const PAGES_PER_SECTION = 4

/** Page fields count fully on the text before the first heading, and as
 *  context everywhere else. */
const WEIGHTS = {
    title: { intro: 8, heading: 2 },
    keywords: { intro: 4, heading: 1 },
    chapter: { intro: 2, heading: 1 },
    heading: 6,
    text: 1,
}

const WORD = /[\p{L}\p{M}\p{N}]+/gu

/** Lowercase, without accents. */
export function fold(text: string): string {
    return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

/** The words of a query, folded. */
export function queryTerms(query: string): string[] {
    return fold(query).match(WORD) ?? []
}

const words = (text: string | undefined) => (text ? (fold(text).match(WORD) ?? []) : [])

interface Prepared {
    title: string[]
    keywords: string[]
    chapter: string[]
    heading: string[]
    text: string[]
}

/** The folded words of each entry, computed on first use. */
const prepared = new WeakMap<SearchEntry, Prepared>()

function prepare(entry: SearchEntry, page: SearchPage): Prepared {
    let found = prepared.get(entry)
    if (!found) {
        found = {
            title: words(page.title),
            keywords: words(page.keywords?.join(' ')),
            chapter: words(page.chapter),
            heading: words(entry.heading),
            text: words(entry.text),
        }
        prepared.set(entry, found)
    }
    return found
}

/** 2 for a whole word, 1 for a word it starts, 0 for none. */
function match(fieldWords: string[], term: string): number {
    let best = 0
    for (const word of fieldWords) {
        if (word === term) return 2
        if (best === 0 && word.startsWith(term)) best = 1
    }
    return best
}

/** The score of an entry, null unless every term is in it or in its page.
 *  `own` tells whether the heading or its text matched, not just the page. */
function scoreEntry(fields: Prepared, terms: string[], intro: boolean): { score: number; own: boolean } | null {
    const place = intro ? 'intro' : 'heading'
    let score = 0
    let own = false

    for (const term of terms) {
        const candidates: [number, number, boolean][] = [
            [match(fields.title, term), WEIGHTS.title[place], false],
            [match(fields.keywords, term), WEIGHTS.keywords[place], false],
            [match(fields.chapter, term), WEIGHTS.chapter[place], false],
            [match(fields.heading, term), WEIGHTS.heading, true],
            [match(fields.text, term), WEIGHTS.text, true],
        ]
        let best = 0
        for (const [quality, weight, isOwn] of candidates) {
            if (quality === 0) continue
            best = Math.max(best, quality * weight)
            if (isOwn) own = true
        }
        if (best === 0) return null
        score += best
    }

    return { score, own }
}

const entryHref = (page: SearchPage, entry: SearchEntry) => (entry.anchor ? `${page.href}#${entry.anchor}` : page.href)

/** Pages ranked by their best entry, each with the headings that matched.
 *  Every word must appear; a word also matches the words it starts. */
export function search(index: SearchIndex, query: string, section?: string): SearchGroup[] {
    const terms = queryTerms(query)
    if (terms.length === 0) return []

    const groups = new Map<number, SearchGroup>()
    for (const entry of index.entries) {
        const page = index.pages[entry.page]
        if (section && page.section !== section) continue

        const intro = entry.heading === undefined
        const scored = scoreEntry(prepare(entry, page), terms, intro)
        if (!scored) continue

        let group = groups.get(entry.page)
        if (!group) {
            group = { page, score: 0, hits: [] }
            groups.set(entry.page, group)
        }
        group.score = Math.max(group.score, scored.score)
        if (!scored.own) continue
        if (intro) group.intro = entry
        else group.hits.push({ entry, href: entryHref(page, entry), score: scored.score })
    }

    return [...groups.values()]
        .toSorted((a, b) => b.score - a.score)
        .slice(0, MAX_GROUPS)
        .map((group) => ({ ...group, hits: group.hits.toSorted((a, b) => b.score - a.score).slice(0, MAX_HITS) }))
}

/** What an empty query shows: the pages outside the sections, then the first
 *  pages of each section; without sections, the first pages of the docs. */
export function openingPages(index: SearchIndex, section?: string): { label?: string; pages: SearchPage[] }[] {
    if (index.sections.length === 0) return [{ pages: index.pages.slice(0, MAX_GROUPS) }]

    const loose = section ? [] : index.pages.filter((page) => !page.section).slice(0, PAGES_PER_SECTION)
    return [
        { pages: loose },
        ...index.sections
            .filter(({ key }) => !section || key === section)
            .map(({ key, label }) => ({
                label,
                pages: index.pages.filter((page) => page.section === key).slice(0, PAGES_PER_SECTION),
            })),
    ].filter((group) => group.pages.length > 0)
}

/** The text around the first matching word, or its start when none matches,
 *  ellipsised where cut. */
export function getSnippet(text: string, terms: string[], before = 40, after = 100): string {
    const parts = markWords(text, terms)
    const first = parts.findIndex((part) => part.match)
    const start = parts.slice(0, Math.max(first, 0)).reduce((length, part) => length + part.text.length, 0)
    const from = Math.max(0, start - before)
    const to = Math.min(text.length, start + after)
    return (from > 0 ? '…' : '') + text.slice(from, to).trim() + (to < text.length ? '…' : '')
}

/** How many characters of `word` fold into the first `length` folded ones,
 *  accents on the last of them included. */
function foldedPrefix(word: string, length: number): number {
    let folded = 0
    let at = 0
    for (const char of word) {
        const size = fold(char).length
        if (folded >= length && size > 0) break
        folded += size
        at += char.length
    }
    return at
}

/** Splits text around the words the terms start, marking the matched starts.
 *  Case and accents are ignored. */
export function markWords(text: string, terms: string[]): { text: string; match: boolean }[] {
    const parts: { text: string; match: boolean }[] = []
    let last = 0
    for (const word of text.matchAll(WORD)) {
        const folded = fold(word[0])
        const term = terms.find((candidate) => folded.startsWith(candidate))
        if (!term) continue

        const end = word.index + foldedPrefix(word[0], term.length)
        if (word.index > last) parts.push({ text: text.slice(last, word.index), match: false })
        parts.push({ text: text.slice(word.index, end), match: true })
        last = end
    }
    if (last < text.length) parts.push({ text: text.slice(last), match: false })
    return parts
}
