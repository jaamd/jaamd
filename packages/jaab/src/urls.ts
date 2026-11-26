import { normaliseBasePath, withDeploymentBase } from '@jaamd/site/urls.ts'

export interface BlogUrlOptions {
    /** routeBase, normalised here: empty at the application root. */
    base: string
    /** Astro's deployment base. */
    deploymentBase?: string
    /** Page urls end with a slash, as Astro builds them. */
    trailingSlash?: boolean
}

/** Public href for a page of the blog: a post's slug, `page/2`, or empty for the index. */
export function blogPageHref(path: string, urls: BlogUrlOptions): string {
    const mount = normaliseBasePath(urls.base)
    const slash = urls.trailingSlash ? '/' : ''

    // An empty path is the mount itself, or the site root.
    const href = path ? `${mount}/${path}${slash}` : mount ? `${mount}${slash}` : '/'
    return withDeploymentBase(href, urls.deploymentBase ?? '')
}

/** Public href for a file below the blog's mount, such as `rss.xml`. */
export function blogFileHref(file: string, urls: BlogUrlOptions): string {
    return withDeploymentBase(`${normaliseBasePath(urls.base)}/${file}`, urls.deploymentBase ?? '')
}

/** Index page `page`, counted from 1: the first is the index itself. */
export function indexPageHref(page: number, urls: BlogUrlOptions): string {
    return blogPageHref(page === 1 ? '' : `page/${page}`, urls)
}
