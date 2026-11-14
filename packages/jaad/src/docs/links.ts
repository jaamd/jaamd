import type { DocsRoot } from './config.ts'
import type { DocsUrlOptions } from './urls.ts'
import { existsSync } from 'node:fs'
import { dirname, relative, resolve, sep } from 'node:path'
import { getDocCollectionId, namedSlug, splitDocLocale } from './model/ids.ts'
import { docsPageHref } from './urls.ts'

export interface DocLinkContext {
    roots: DocsRoot[]
    locales: string[]
    urls: (locale?: string) => DocsUrlOptions
}

/**
 * The url of the page a relative link to a markdown file points at, or null
 * when the link is not one: absolute, external, or to a file outside the docs.
 */
export function resolveDocLink(href: string, fromFile: string, context: DocLinkContext): string | null {
    if (/^([a-z][a-z\d+.-]*:|\/|#)/i.test(href)) return null

    const [path, hash = ''] = href.split('#', 2)
    if (!path.endsWith('.md')) return null

    let decoded: string
    try {
        decoded = decodeURI(path)
    } catch {
        return null
    }

    const target = resolve(dirname(fromFile), decoded)
    const root = context.roots.find(({ dir }) => target.startsWith(dir + sep))
    if (!root) return null

    if (!existsSync(target)) {
        throw new Error(`jaad: ${fromFile} links to ${href}, which does not exist`)
    }

    const { locale, id } = splitDocLocale(getDocCollectionId(relative(root.dir, target)), context.locales)
    const slug = namedSlug(id, root.section)
    return docsPageHref(slug, context.urls(locale ?? undefined)) + (hash ? `#${hash}` : '')
}
