import { localeSegment } from '../site/locales.ts'
import { normaliseBasePath, withDeploymentBase } from '../site/urls.ts'

export interface DocsUrlOptions {
    /** routeBase, normalised here: empty at the application root. */
    docsBase: string
    /** Astro's deployment base. */
    deploymentBase?: string
    /** Locale of the page, when the docs are localised. */
    locale?: string
    /** The one locale that owns the unprefixed urls. */
    defaultLocale?: string
}

/** Public href for a documentation page. Empty slug means the opening page. */
export function docsPageHref(slug: string, urls: DocsUrlOptions): string {
    return docsHref(slug, urls)
}

/** Raw Markdown keeps the page's named slug, including for the opener. */
export function docsMarkdownHref(slug: string, urls: DocsUrlOptions): string {
    return docsHref(slug, urls, '.md')
}

function docsHref(
    slug: string,
    { docsBase, deploymentBase = '', locale, defaultLocale }: DocsUrlOptions,
    suffix = '',
): string {
    const mount = normaliseBasePath(docsBase)
    const path = [localeSegment(locale, defaultLocale), slug].filter(Boolean).join('/')
    // Without a suffix an empty path is the mount itself; with one it is a file.
    const href = path || suffix ? `${mount}/${path}${suffix}` : mount || '/'
    return withDeploymentBase(href, deploymentBase)
}
