/** The version of the index format. A change that breaks a reader raises it;
 *  fields added along the way are optional. */
export const SEARCH_INDEX_VERSION = 1

/** The search index of one locale, as `search-index.json` serves it. */
export interface SearchIndex {
    version: typeof SEARCH_INDEX_VERSION
    /** Empty when the docs are not split into sections. */
    sections: { key: string; label: string }[]
    pages: SearchPage[]
    entries: SearchEntry[]
}

export interface SearchPage {
    title: string
    href: string
    /** The page as Markdown. */
    markdown?: string
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
    /** The text of its code blocks, cut to a few thousand characters. */
    code?: string
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
    /** Code counts least: names in it are often repeated across pages. */
    code: 0.5,
}

const WORD = /[\p{L}\p{M}\p{N}]+/gu

/** Lowercase, without accents. */
export function fold(text: string): string {
    return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

/** Word boundaries from the platform where it has them: they also split
 *  Chinese, Japanese and Thai, which write no spaces between words. */
const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter(undefined, { granularity: 'word' }) : null

/** The folded words of a text. */
function words(text: string | undefined): string[] {
    if (!text) {
        return []
    }
    const folded = fold(text)
    if (!segmenter) {
        return folded.match(WORD) ?? []
    }

    const found: string[] = []
    for (const segment of segmenter.segment(folded)) {
        if (segment.isWordLike) {
            found.push(segment.segment)
        }
    }
    return found
}

/** The words of a query, folded. */
export function queryTerms(query: string): string[] {
    return words(query)
}

interface Prepared {
    title: string[]
    keywords: string[]
    chapter: string[]
    heading: string[]
    text: string[]
    code: string[]
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
            code: words(entry.code),
        }
        prepared.set(entry, found)
    }
    return found
}

/** Shorter terms get no typo allowance: one edit would match too much. */
const TYPO_MIN_LENGTH = 5

/** Whether `a` becomes `b` with at most one edit: a letter added, removed,
 *  replaced, or two neighbours swapped. */
export function withinOneEdit(a: string, b: string): boolean {
    if (a === b) {
        return true
    }
    if (Math.abs(a.length - b.length) > 1) {
        return false
    }

    let start = 0
    while (start < a.length && start < b.length && a[start] === b[start]) {
        start++
    }

    if (a.length === b.length) {
        const rest = (from: number) => {
            return a.slice(from) === b.slice(from)
        }
        const swapped = a[start] === b[start + 1] && a[start + 1] === b[start] && rest(start + 2)
        return rest(start + 1) || swapped
    }

    const [longer, shorter] = a.length > b.length ? [a, b] : [b, a]
    return longer.slice(start + 1) === shorter.slice(start)
}

/** 2 for a whole word, 1 for a word it starts, 0.5 for a word one typo away,
 *  0 for none. */
function match(fieldWords: string[], term: string): number {
    let best = 0
    for (const word of fieldWords) {
        if (word === term) {
            return 2
        }
        if (word.startsWith(term)) {
            best = 1
        } else if (best === 0 && term.length >= TYPO_MIN_LENGTH && withinOneEdit(word, term)) {
            best = 0.5
        }
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
            [match(fields.code, term), WEIGHTS.code, true],
        ]
        let best = 0
        for (const [quality, weight, isOwn] of candidates) {
            if (quality === 0) {
                continue
            }
            best = Math.max(best, quality * weight)
            if (isOwn) {
                own = true
            }
        }
        if (best === 0) {
            return null
        }
        score += best
    }

    return { score, own }
}

const entryHref = (page: SearchPage, entry: SearchEntry) => {
    return entry.anchor ? `${page.href}#${entry.anchor}` : page.href
}

/** Pages ranked by their best entry, each with the headings that matched.
 *  Every word must appear; a word also matches the words it starts. */
export function search(index: SearchIndex, query: string, section?: string): SearchGroup[] {
    const terms = queryTerms(query)
    if (terms.length === 0) {
        return []
    }

    const groups = new Map<number, SearchGroup>()
    for (const entry of index.entries) {
        const page = index.pages[entry.page]
        if (page === undefined || (section && page.section !== section)) {
            continue
        }

        const intro = entry.heading === undefined
        const scored = scoreEntry(prepare(entry, page), terms, intro)
        if (!scored) {
            continue
        }

        let group = groups.get(entry.page)
        if (!group) {
            group = { page, score: 0, hits: [] }
            groups.set(entry.page, group)
        }
        group.score = Math.max(group.score, scored.score)
        if (!scored.own) {
            continue
        }
        if (intro) {
            group.intro = entry
        } else {
            group.hits.push({ entry, href: entryHref(page, entry), score: scored.score })
        }
    }

    return [...groups.values()]
        .toSorted((a, b) => {
            return b.score - a.score
        })
        .slice(0, MAX_GROUPS)
        .map((group) => {
            return {
                ...group,
                hits: group.hits
                    .toSorted((a, b) => {
                        return b.score - a.score
                    })
                    .slice(0, MAX_HITS),
            }
        })
}

/** What an empty query shows: the pages outside the sections, then the first
 *  pages of each section; without sections, the first pages of the docs. */
export function openingPages(index: SearchIndex, section?: string): { label?: string; pages: SearchPage[] }[] {
    if (index.sections.length === 0) {
        return [{ pages: index.pages.slice(0, MAX_GROUPS) }]
    }

    const loose = section
        ? []
        : index.pages
              .filter((page) => {
                  return !page.section
              })
              .slice(0, PAGES_PER_SECTION)
    return [
        { pages: loose },
        ...index.sections
            .filter(({ key }) => {
                return !section || key === section
            })
            .map(({ key, label }) => {
                return {
                    label,
                    pages: index.pages
                        .filter((page) => {
                            return page.section === key
                        })
                        .slice(0, PAGES_PER_SECTION),
                }
            }),
    ].filter((group) => {
        return group.pages.length > 0
    })
}

/** The text around the first matching word, or its start when none matches,
 *  ellipsised where cut. */
export function getSnippet(text: string, terms: string[], before = 40, after = 100): string {
    const parts = markWords(text, terms)
    const first = parts.findIndex((part) => {
        return part.match
    })
    const start = parts.slice(0, Math.max(first, 0)).reduce((length, part) => {
        return length + part.text.length
    }, 0)
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
        if (folded >= length && size > 0) {
            break
        }
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
        const term = terms.find((candidate) => {
            return folded.startsWith(candidate)
        })
        if (!term) {
            continue
        }

        const end = word.index + foldedPrefix(word[0], term.length)
        if (word.index > last) {
            parts.push({ text: text.slice(last, word.index), match: false })
        }
        parts.push({ text: text.slice(word.index, end), match: true })
        last = end
    }
    if (last < text.length) {
        parts.push({ text: text.slice(last), match: false })
    }
    return parts
}
