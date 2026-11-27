/** The props of `Meta.astro`: what a page tells search engines, social previews and agents about itself:
 *  description, canonical, alternates, feeds, Open Graph and Twitter. Every
 *  page of the shell has it through `Head`; a layout of a project's own can
 *  put it in its `<head>` alone. */
import type { Author } from './authors.ts'
import { withDeploymentBase } from './urls.ts'

export interface MetaProps {
    title: string
    description: string
    /** Page frontmatter; each field overrides the site's. */
    keywords?: string[] | undefined
    /** Each a `<meta name="author">`, and a `<link rel="author">` when it has a url. */
    authors?: Author[] | undefined
    image?: string | false | undefined
    modified?: Date | undefined
    /** BCP-47 tag of this page's locale. */
    language?: string | undefined
    /** Every locale that has this page, for hreflang and og:locale:alternate. */
    alternates?: { code: string; tag: string; href: string }[] | undefined
    /** Where a reader with no matching language should land. */
    xDefault?: string | undefined
    /** The page as Markdown, announced to agents. */
    markdown?: string | undefined
    /** A dated piece, such as a post: the page is an Open Graph article. */
    article?: { published: Date; tags: string[] } | undefined
}

/** A page's image, absolute: the page's own, else the site's. Open Graph and
 *  structured data reject relative paths, so a path without `site` gives none,
 *  and `false` none at all. */
export function pageImageUrl(chosen: string | false, deploymentBase: string, site: URL | undefined): string | null {
    if (chosen === false) {
        return null
    }
    if (/^https?:\/\//.test(chosen)) {
        return chosen
    }
    if (!site) {
        return null
    }
    return new URL(withDeploymentBase(chosen, deploymentBase), site).href
}
