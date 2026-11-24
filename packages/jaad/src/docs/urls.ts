import { localeSegment } from '@jaamd/site/locales.ts'
import { normaliseBasePath, withDeploymentBase } from '@jaamd/site/urls.ts'

export interface DocsUrlOptions {
    /** routeBase, normalised here: empty at the application root. */
    docsBase: string
    /** Astro's deployment base. */
    deploymentBase?: string
    /** Locale of the page, when the docs are localised. */
    locale?: string
    /** The one locale that owns the unprefixed urls. */
    defaultLocale?: string
    /** Page urls end with a slash, as Astro builds them. */
    trailingSlash?: boolean
}

/** Whether Astro builds page urls with a trailing slash: always with
 *  `trailingSlash: 'always'`, and with `'ignore'` when every page is a directory. */
export function pageUrlsEndWithSlash(astro: { trailingSlash: string; build: { format: string } }): boolean {
    if (astro.trailingSlash === 'always') return true
    return astro.trailingSlash === 'ignore' && astro.build.format === 'directory'
}

/** Public href for a documentation page. Empty slug means the opening page. */
export function docsPageHref(slug: string, urls: DocsUrlOptions): string {
    const mount = normaliseBasePath(urls.docsBase)
    const path = localisedPath(slug, urls)
    const slash = urls.trailingSlash ? '/' : ''

    // An empty path is the mount itself, or the site root.
    const href = path ? `${mount}/${path}${slash}` : mount ? `${mount}${slash}` : '/'
    return withDeploymentBase(href, urls.deploymentBase ?? '')
}

/** Public href for a file below the docs mount, such as `search-index.json`. */
export function docsFileHref(file: string, urls: DocsUrlOptions): string {
    const mount = normaliseBasePath(urls.docsBase)
    return withDeploymentBase(`${mount}/${localisedPath(file, urls)}`, urls.deploymentBase ?? '')
}

/** Raw Markdown keeps the page's named slug, including for the opener. */
export function docsMarkdownHref(slug: string, urls: DocsUrlOptions): string {
    return docsFileHref(`${slug}.md`, urls)
}

function localisedPath(path: string, { locale, defaultLocale }: DocsUrlOptions): string {
    return [localeSegment(locale, defaultLocale), path].filter(Boolean).join('/')
}
