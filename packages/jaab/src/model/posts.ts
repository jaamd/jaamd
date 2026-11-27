/** What the posts' files say, before any collection exists: slugs, dates,
 *  order, pages and the errors a post can make. Pure, so it is tested alone. */

import { slug as githubSlug } from 'github-slugger'

/** An optional date before the name, as in `2026-11-22-introducing-jaab.md`. */
const DATE_PREFIX = /^\d{4}-\d{2}-\d{2}-(.+)$/

/** A day, or a day and a time with its offset: a time without one would be
 *  read in the build machine's zone. */
const POST_DATE = /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2}))?$/

/** Paths of the blog's own routes, below its base, that no post may take. */
const RESERVED_PATHS = ['page', 'rss.xml', 'llms.txt', 'llms-full.txt']

/** A post's slug from its path below `blogDir`: the file name, or the
 *  directory of an `index.md`, without a date prefix. Null for the blog's own
 *  `index.md`, which introduces the index. */
export function postSlug(path: string): string | null {
    const parts = path.replace(/\.md$/, '').split('/')
    if (parts.at(-1) === 'index') {
        parts.pop()
    }
    if (parts.length === 0) {
        return null
    }

    const name = parts.pop()!
    const undated = DATE_PREFIX.exec(name)?.[1] ?? name
    return [...parts, undated]
        .map((part) => {
            return githubSlug(part)
        })
        .join('/')
}

/** The day of a date, as `2026-11-22`, in UTC. */
export function isoDay(date: Date): string {
    return date.toISOString().slice(0, 10)
}

/** The day a frontmatter date is written on, as `2026-11-22`: a time near
 *  midnight keeps its author's day. Null when the value is no date, or names
 *  a day the calendar lacks, as `2026-02-30`, which `Date` would roll over. */
export function writtenDay(value: unknown): string | null {
    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : isoDay(value)
    }
    if (typeof value !== 'string' || !POST_DATE.test(value.trim())) {
        return null
    }

    const day = value.trim().slice(0, 10)
    const [year = 0, month = 1, date = 1] = day.split('-').map(Number)
    const calendar = new Date(Date.UTC(year, month - 1, date))
    return isoDay(calendar) === day ? day : null
}

/** A frontmatter date, as YAML or Astro hands it over; null when it is none. */
export function parsePostDate(value: unknown): Date | null {
    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value
    }
    if (writtenDay(value) === null) {
        return null
    }

    const date = new Date((value as string).trim())
    return Number.isNaN(date.getTime()) ? null : date
}

/** A day, as `writtenDay` gives it, in `language`. */
export function formatPostDay(day: string, language: string): string {
    // Midnight in UTC, read in UTC: the day itself, whatever the build machine's zone.
    return new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(day))
}

const WORDS_PER_MINUTE = 200

/** Minutes to read `text`, at least one. */
export function readingMinutes(text: string): number {
    const words = text.split(/\s+/).filter((word) => {
        return /[\p{L}\p{N}]/u.test(word)
    })
    return Math.max(1, Math.ceil(words.length / WORDS_PER_MINUTE))
}

/** Newest first; on the same date, by slug. */
export function comparePosts(a: { date: Date; slug: string }, b: { date: Date; slug: string }): number {
    const difference = b.date.getTime() - a.date.getTime()
    if (difference !== 0) {
        return difference
    }
    return a.slug.localeCompare(b.slug)
}

/** The number of index pages for `count` posts: one even with none. */
export function pageCount(count: number, perPage: number): number {
    return Math.max(1, Math.ceil(count / perPage))
}

/** The posts of index page `page`, counted from 1. */
export function pagePosts<Post>(posts: Post[], page: number, perPage: number): Post[] {
    const start = (page - 1) * perPage
    return posts.slice(start, start + perPage)
}

/** A post as read from disk, for the checks the build runs before Astro does. */
export interface PostFile {
    /** Relative to the project, for the messages. */
    file: string
    slug: string
    data: Record<string, unknown>
}

/** The old addresses of a post, as slugs below the blog's base. */
export function aliasSlugs(data: Record<string, unknown>): string[] {
    if (!Array.isArray(data.aliases)) {
        return []
    }
    return data.aliases
        .filter((alias) => {
            return typeof alias === 'string'
        })
        .map((alias) => {
            return alias.replace(/^\/+|\/+$/g, '')
        })
}

const isReserved = (slug: string): boolean => {
    return RESERVED_PATHS.some((path) => {
        return slug === path || slug.startsWith(`${path}/`)
    })
}

/** What is wrong with the posts, one line each with its remedy. */
export function postErrors(posts: PostFile[]): string[] {
    const errors: string[] = []
    const owners = new Map<string, string>()

    for (const post of posts) {
        const { file, data } = post

        if (data.date === undefined || data.date === null) {
            errors.push(`${file} has no date. Add one to its frontmatter, as date: 2026-11-22.`)
        } else if (!parsePostDate(data.date)) {
            errors.push(
                `${file} has the date "${String(data.date)}", which is not one. ` +
                    'Write a day, as 2026-11-22, or a time with its offset, as 2026-11-22T09:30:00+01:00.',
            )
        }

        if (data.draft !== undefined) {
            errors.push(
                `${file} sets draft, which JAAB does not read: a post is published when it is in the blog. ` +
                    'Remove the field, or keep the file out of the blog until it is ready.',
            )
        }

        if (post.slug === '') {
            errors.push(
                `${file} would be served as the blog's index: its name has no letter or digit. Rename the file.`,
            )
        } else if (isReserved(post.slug)) {
            errors.push(`${file} would be served at /${post.slug}, a route of the blog's own. Rename the file.`)
        }
        const owner = owners.get(post.slug)
        if (owner) {
            errors.push(`${owner} and ${file} are both served at /${post.slug}. Rename one of them.`)
        } else {
            owners.set(post.slug, file)
        }
    }

    // After every slug is known, so an alias may name a post that comes later.
    for (const post of posts) {
        for (const alias of aliasSlugs(post.data)) {
            const owner = owners.get(alias)
            if (alias === '') {
                errors.push(`${post.file} has the alias /, the blog's index. Remove it.`)
            } else if (isReserved(alias)) {
                errors.push(`${post.file} has the alias /${alias}, a route of the blog's own. Remove it.`)
            } else if (owner && owner !== post.file) {
                errors.push(`${post.file} has the alias /${alias}, which is where ${owner} is served. Remove it.`)
            } else if (owner === post.file) {
                errors.push(`${post.file} has its own address, /${alias}, as an alias. Remove it.`)
            } else {
                owners.set(alias, post.file)
            }
        }
    }

    return errors
}
