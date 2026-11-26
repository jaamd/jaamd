import type { DocsRoot } from './config.ts'
import type { DocsUrlOptions } from './urls.ts'
import { existsSync, readFileSync } from 'node:fs'
import { relative, sep } from 'node:path'
import { markdownLinkTarget } from '@jaamd/site/link-plugins.ts'
import { readFrontmatter } from './model/frontmatter.ts'
import { getDocCollectionId, namedSlug, splitDocLocale } from './model/ids.ts'
import { docsPageHref } from './urls.ts'

export interface DocLinkContext {
    roots: DocsRoot[]
    locales: string[]
    urls: (locale?: string) => DocsUrlOptions
    /** Told of a link to a draft, which production builds leave out. */
    onDraftLink?: (fromFile: string, href: string) => void
}

/**
 * The url of the page a relative link to a markdown file points at, or null
 * when the link is not one: absolute, external, or to a file outside the docs.
 */
export function resolveDocLink(href: string, fromFile: string, context: DocLinkContext): string | null {
    const link = markdownLinkTarget(href, fromFile)
    if (!link) {
        return null
    }
    const { file: target, hash } = link

    const root = context.roots.find(({ dir }) => {
        return target.startsWith(dir + sep)
    })
    if (!root) {
        return null
    }

    if (!existsSync(target)) {
        throw new Error(`jaad: ${fromFile} links to ${href}, which does not exist`)
    }
    if (context.onDraftLink && readFrontmatter(readFileSync(target, 'utf8')).draft) {
        context.onDraftLink(fromFile, href)
    }

    const { locale, id } = splitDocLocale(getDocCollectionId(relative(root.dir, target)), context.locales)
    const slug = namedSlug(id, root.section)
    return docsPageHref(slug, context.urls(locale ?? undefined)) + (hash ? `#${hash}` : '')
}
