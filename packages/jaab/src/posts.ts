/// <reference path="./env.d.ts" />

import type { BlogAuthor } from './config.ts'
import type { IntroEntry, PostEntry } from './types.ts'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { readFrontmatter } from '@jaamd/site/frontmatter.ts'
import { editUrl } from '@jaamd/site/infer.ts'
import { htmlText, pageDescription, renderedTitle } from '@jaamd/site/rendered.ts'
import { oncePerBuild } from '@jaamd/site/runtime.ts'
import { getCollection } from 'astro:content'
import config from 'virtual:jaab/config'
import { withoutTitle } from './model/html.ts'
import { comparePosts, isoDay, readingMinutes, writtenDay } from './model/posts.ts'
import { blogUrls } from './runtime.ts'
import { blogFileHref, blogPageHref } from './urls.ts'

/** A post, with what its pages, the feed and the llms files need. */
export interface BlogPost {
    slug: string
    title: string
    /** The frontmatter's, else the text before `<!-- more -->`, else the first paragraph. */
    description: string | null
    /** The instant, for the order and the metadata. */
    date: Date
    /** The day as the frontmatter writes it, as `2026-11-22`, for the pages. */
    day: string
    updated: Date | null
    updatedDay: string | null
    tags: string[]
    keywords: string[]
    /** Resolved from `authors`; the site's author when the post names none. */
    authors: BlogAuthor[]
    readingTime: number
    href: string
    markdownHref: string
    editHref: string | null
    /** Older, then newer: the reading order of the index. */
    older: BlogPost | null
    newer: BlogPost | null
    entry: PostEntry
}

const MORE = '<!-- more -->'

function describe(entry: PostEntry, title: string): string | null {
    if (entry.data.description) {
        return entry.data.description
    }

    const html = entry.rendered?.html ?? ''
    const more = html.indexOf(MORE)
    if (more !== -1) {
        // The title, when the body opens with it, is no part of the summary.
        return htmlText(withoutTitle(html.slice(0, more))) || null
    }
    return pageDescription(entry.rendered, title)
}

function authorsOf(entry: PostEntry): BlogAuthor[] {
    const keys = [entry.data.authors ?? config.blog.author ?? []].flat()
    return keys.flatMap((key) => {
        const author = config.blog.authors[key]
        return author ? [author] : []
    })
}

/** Where a post's file is edited: its path below `blogDir`. */
function editHrefOf(entry: PostEntry): string | null {
    if (!config.blog.editBase || !entry.filePath) {
        return null
    }
    const dir = config.blog.dir.replace(/^\.\//, '').replace(/\/$/, '')
    const path = entry.filePath.startsWith(`${dir}/`) ? entry.filePath.slice(dir.length + 1) : entry.filePath
    return editUrl(config.blog.editBase, path)
}

/** The post's dates as its file writes them: Astro hands over instants, and a
 *  time near midnight would show its author's day in UTC. */
function writtenDays(entry: PostEntry): { day: string; updatedDay: string | null } {
    const raw = entry.filePath ? readFrontmatter(readFileSync(join(config.blog.root, entry.filePath), 'utf8')) : {}
    const updated = entry.data.lastUpdated

    return {
        day: writtenDay(raw.date) ?? isoDay(entry.data.date),
        updatedDay: updated ? (writtenDay(raw.lastUpdated) ?? isoDay(updated)) : null,
    }
}

function toPost(entry: PostEntry): BlogPost {
    const title = entry.data.title ?? renderedTitle(entry.rendered) ?? entry.id
    const text = htmlText(entry.rendered?.html ?? '')
    const urls = blogUrls()

    return {
        slug: entry.id,
        title,
        description: describe(entry, title),
        date: entry.data.date,
        updated: entry.data.lastUpdated ?? null,
        ...writtenDays(entry),
        tags: entry.data.tags,
        keywords: entry.data.keywords,
        authors: authorsOf(entry),
        readingTime: readingMinutes(text),
        href: blogPageHref(entry.id, urls),
        markdownHref: blogFileHref(`${entry.id}.md`, urls),
        editHref: editHrefOf(entry),
        older: null,
        newer: null,
        entry,
    }
}

async function readPosts(): Promise<BlogPost[]> {
    const entries = (await getCollection('blogPosts' as never)) as unknown as PostEntry[]
    const posts = entries.map(toPost).toSorted(comparePosts)
    for (const [at, post] of posts.entries()) {
        post.newer = posts[at - 1] ?? null
        post.older = posts[at + 1] ?? null
    }
    return posts
}

/** Every post, newest first, each linked to its neighbours. */
export const getPosts = oncePerBuild(readPosts)

/** The blog's own `index.md`, shown above the list; none when it has no such file. */
export async function getIntro(): Promise<IntroEntry | undefined> {
    const [intro] = (await getCollection('blogIndex' as never)) as unknown as IntroEntry[]
    return intro
}

/** Whether the site has more than one author, so a post names its own. */
export function namesAuthors(): boolean {
    return Object.keys(config.blog.authors).length > 1
}
