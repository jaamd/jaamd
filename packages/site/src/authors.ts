import { z } from 'astro/zod'
import { linkHref } from './schema.ts'
import { withDeploymentBase } from './urls.ts'

/** Someone who wrote a page, and where to read about them. */
export interface Author {
    name: string
    url: string | null
}

/** A person of the site's `authors` option, or one a page writes out. */
export const authorShape = z.strictObject({
    name: z.string(),
    url: linkHref('an author url').optional(),
})

export type AuthorOption = z.output<typeof authorShape>

const authorReference = z.union([z.string(), authorShape])

/** `authors` in a page's frontmatter: one author or a list, each a key of the
 *  site's `authors`, a name, or a name with its url. */
export const authorsField = z.union([authorReference, z.array(authorReference)]).optional()

export type AuthorsField = z.output<typeof authorsField>

/** A string is a key of `people` when it is one, otherwise a name. */
export function resolveAuthors(named: AuthorsField, people: Record<string, AuthorOption>): Author[] {
    const references = [named ?? []].flat()
    return references.map((reference) => {
        const person = typeof reference === 'string' ? (people[reference] ?? { name: reference }) : reference
        return { name: person.name, url: person.url ?? null }
    })
}

/** The frontmatter fields that name a page's authors. `author` is the older,
 *  single name of `@jaamd/astro`'s frontmatter. */
export interface AuthorsData {
    authors?: AuthorsField
    author?: string | undefined
}

/**
 * The authors of a page: those it names in `authors`, else its `author`, else
 * the package's default, the key `fallback`. `authors: []` names nobody, even
 * with a default.
 */
export function pageAuthors(
    data: AuthorsData,
    people: Record<string, AuthorOption>,
    fallback: string | null,
): Author[] {
    if (data.authors !== undefined) {
        return resolveAuthors(data.authors, people)
    }
    if (data.author) {
        return resolveAuthors(data.author, people)
    }
    if (fallback) {
        return resolveAuthors(fallback, people)
    }
    return []
}

/** Stops the config when the default author is not one of `authors`. */
export function assertDefaultAuthor(
    product: string,
    author: string | undefined,
    people: Record<string, AuthorOption>,
): void {
    if (author === undefined || author in people) {
        return
    }
    throw new Error(
        `${product}: author is "${author}", which authors does not list\n` +
            `  Add it to authors, as authors: { "${author}": { name: "…" } }.`,
    )
}

/** An author's url as a link on the page: a root-relative one follows Astro's `base`. */
export function authorHref(author: Author, deploymentBase: string): string | null {
    return author.url === null ? null : withDeploymentBase(author.url, deploymentBase)
}

/** An author's url as metadata needs it, absolute; null without `site` for a relative one. */
export function absoluteAuthorUrl(author: Author, deploymentBase: string, site: URL | undefined): string | null {
    const href = authorHref(author, deploymentBase)
    if (href === null || /^[a-z][a-z\d+.-]*:/i.test(href)) {
        return href
    }
    return site ? new URL(href, site).href : null
}
