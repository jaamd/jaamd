import type { BlogUrlOptions } from './urls.ts'
import { existsSync } from 'node:fs'
import { relative, sep } from 'node:path'
import { markdownLinkTarget } from '@jaamd/site/link-plugins.ts'
import { postSlug } from './model/posts.ts'
import { blogPageHref } from './urls.ts'

export interface PostLinkContext {
    /** The blog's directory, absolute. */
    dir: string
    urls: BlogUrlOptions
}

/**
 * The url of the post a relative link to a markdown file points at, or null
 * when the link is not one: absolute, external, or to a file outside the
 * blog. The blog's own `index.md` is its index.
 */
export function resolvePostLink(href: string, fromFile: string, context: PostLinkContext): string | null {
    const link = markdownLinkTarget(href, fromFile)
    if (!link) {
        return null
    }
    const { file: target, hash } = link

    if (!target.startsWith(context.dir + sep)) {
        return null
    }
    if (!existsSync(target)) {
        throw new Error(`jaab: ${fromFile} links to ${href}, which does not exist`)
    }

    const slug = postSlug(relative(context.dir, target).split(sep).join('/'))
    return blogPageHref(slug ?? '', context.urls) + (hash ? `#${hash}` : '')
}
