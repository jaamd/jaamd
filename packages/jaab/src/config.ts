import { ASTRO_OPTIONS, fontVariables, type AstroOptions } from '@jaamd/site/astro-config.ts'
import { resolveSiteConfig, siteConfigShape, siteOptionsOf, type SiteResolvedConfig } from '@jaamd/site/config.ts'
import { inferRepo, resolveEditBase } from '@jaamd/site/infer.ts'
import { parseOptions } from '@jaamd/site/options.ts'
import { toProjectPaths, type ProjectPaths } from '@jaamd/site/paths.ts'
import { normaliseBasePath } from '@jaamd/site/urls.ts'
import { z } from 'astro/zod'

/** Someone who writes posts, by the key the posts name them with. */
const authorShape = z.strictObject({
    name: z.string(),
    url: z.string().optional(),
})

/** The options of the blog: where the posts are, where they are served and how. */
export const blogConfigShape = {
    blogDir: z.string().default('./blog'),
    routeBase: z.string().default('/'),
    /** Posts on each page of the index. */
    perPage: z.number().int().positive().default(10),
    /** `rss.xml`, with the newest posts in full: true for the last 20, false for none. */
    feed: z.union([z.boolean(), z.strictObject({ limit: z.number().int().positive() })]).default(true),
    /** The minutes to read a post, in the default layout. */
    readingTime: z.boolean().default(true),
    /** The key in `authors` of whoever writes a post that names no one. */
    author: z.string().optional(),
    authors: z.record(z.string(), authorShape).default({}),
    /** true infers the link from the repository, a string sets its base, false removes it. */
    editLink: z.union([z.boolean(), z.string()]).default(true),
    /** `llms.txt`, `llms-full.txt` and the Markdown of each post; false leaves them out. */
    llms: z.boolean().default(true),
}

/** Site options, then blog options: the order the error for an unknown one lists them. */
export const jaabConfigSchema = z.object({ ...siteConfigShape, ...blogConfigShape })

export type JaabConfig = z.output<typeof jaabConfigSchema>

export type JaabUserConfig = z.input<typeof jaabConfigSchema> & AstroOptions

export type BlogAuthor = z.output<typeof authorShape>

export interface BlogResolvedConfig {
    /** Where the blog is mounted, without a trailing slash. Empty at the root. */
    base: string
    /** The project's root, which the posts' `filePath` is relative to. */
    root: string
    /** `blogDir` as configured, relative to the project. */
    dir: string
    perPage: number
    /** Null without a feed. */
    feed: { limit: number } | null
    readingTime: boolean
    author: string | null
    authors: Record<string, BlogAuthor>
    editBase: string | null
    llms: boolean
    /** Page urls end with a slash, as Astro builds them. Set once Astro has resolved the project. */
    trailingSlash: boolean
}

/** What the components read: the site's fields at the top, the blog's under `blog`. */
export interface JaabResolvedConfig extends SiteResolvedConfig {
    blog: BlogResolvedConfig
}

/** The options, checked: an unknown or invalid one stops the config from loading. */
export function parseConfig(options: JaabUserConfig): JaabConfig {
    const config = parseOptions(jaabConfigSchema, options, { product: 'jaab', forwarded: ASTRO_OPTIONS })

    if (config.author !== undefined && !(config.author in config.authors)) {
        throw new Error(
            `jaab: author is "${config.author}", which authors does not list\n` +
                `  Add it to authors, as authors: { "${config.author}": { name: "…" } }.`,
        )
    }
    return config
}

/** Posts in the feed when `feed` is true: readers keep the ones they have seen. */
const FEED_LIMIT = 20

function resolveFeed(feed: JaabConfig['feed']): { limit: number } | null {
    if (feed === false) {
        return null
    }
    return feed === true ? { limit: FEED_LIMIT } : feed
}

/** The config with what the project tells: repository and public assets.
 *  `project` is a root, or the directories Astro resolved. */
export function resolveConfig(
    options: JaabUserConfig,
    project: ProjectPaths | string = process.cwd(),
): JaabResolvedConfig {
    const paths = toProjectPaths(project)
    const config = parseConfig(options)
    const repo = inferRepo(paths.root)
    const siteOptions = siteOptionsOf(config)

    return {
        ...siteOptions,
        ...resolveSiteConfig(siteOptions, repo, paths),
        locales: [],
        defaultLocale: config.lang,
        fonts: fontVariables(options),
        blog: {
            base: normaliseBasePath(config.routeBase),
            root: paths.root,
            dir: config.blogDir,
            perPage: config.perPage,
            feed: resolveFeed(config.feed),
            readingTime: config.readingTime,
            author: config.author ?? null,
            authors: config.authors,
            editBase: resolveEditBase(config.editLink, repo, config.blogDir),
            llms: config.llms,
            trailingSlash: true,
        },
    }
}

/** Identity helper, for a typed `jaab.config.ts`. */
export function defineJaabConfig(config: JaabUserConfig): JaabUserConfig {
    return config
}
