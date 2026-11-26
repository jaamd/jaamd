import type { JaabResolvedConfig, JaabUserConfig } from './config.ts'
import type { PostFile } from './model/posts.ts'
import type { SiteIntegration } from '@jaamd/site/integration.ts'
import type { ReservedPath } from '@jaamd/site/members.ts'
import type { AstroIntegration } from 'astro'
import { existsSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { siteCoordinator, siteMember } from '@jaamd/site/integration.ts'
import { installLinkPlugin } from '@jaamd/site/link-plugins.ts'
import { setupRedirects } from '@jaamd/site/redirects.ts'
import { normaliseBasePath, pageUrlsEndWithSlash } from '@jaamd/site/urls.ts'
import { serialisedModule } from '@jaamd/site/virtual.ts'
import { resolveConfig } from './config.ts'
import { resolvePostLink, type PostLinkContext } from './links.ts'
import { readPostFiles } from './model/frontmatter.ts'
import { aliasSlugs, postErrors } from './model/posts.ts'
import { blogPageHref, type BlogUrlOptions } from './urls.ts'

type ServerParams = Parameters<NonNullable<AstroIntegration['hooks']['astro:server:setup']>>[0]
type SetupParams = Parameters<NonNullable<AstroIntegration['hooks']['astro:config:setup']>>[0]

const routeEntrypoint = (file: string) => {
    return fileURLToPath(new URL(`./routes/${file}`, import.meta.url))
}

const LAYOUT_ID = 'virtual:jaab/layout'
const RESOLVED_LAYOUT_ID = `\0${LAYOUT_ID}`
const DEFAULT_LAYOUT = fileURLToPath(new URL('./layouts/Default.astro', import.meta.url))

/** `virtual:jaab/layout`: the component every page of the blog renders in. */
function layoutModule(file: string) {
    return {
        name: 'jaab:layout',
        resolveId: (source: string) => {
            return source === LAYOUT_ID ? RESOLVED_LAYOUT_ID : null
        },
        load: (id: string) => {
            return id === RESOLVED_LAYOUT_ID ? `export { default } from ${JSON.stringify(file)};` : null
        },
    }
}

/** A `layout` that names no file stops the build, saying what to create. */
function assertLayout(options: JaabUserConfig, file: string | null): void {
    if (file !== null && !existsSync(file)) {
        throw new Error(
            `jaab: layout is "${options.layout}", which does not exist\n` +
                "  Create it, or leave layout out for the blog's own.",
        )
    }
}

/** The routes of the blog, by pattern, and the file serving each. `rootLlms`
 *  false leaves the llms files out of a blog at the root, where the site
 *  serves its own; `feed` false leaves out `rss.xml`. */
export function getInjectedRoutes(
    base: string,
    { llms, rootLlms, feed }: { llms: boolean; rootLlms: boolean; feed: boolean },
): [string, string][] {
    return [
        [base, 'index.astro'],
        [`${base}/page/[page]`, 'index-page.astro'],
        ...(feed ? ([[`${base}/rss.xml`, 'rss.xml.ts']] as [string, string][]) : []),
        ...(llms && (base !== '' || rootLlms)
            ? ([
                  [`${base}/llms.txt`, 'llms.txt.ts'],
                  [`${base}/llms-full.txt`, 'llms-full.txt.ts'],
              ] as [string, string][])
            : []),
        [`${base}/[...slug]`, 'post.astro'],
        ...(llms ? ([[`${base}/[...slug].md`, 'post.md.ts']] as [string, string][]) : []),
    ]
}

/** Posts, or their aliases, inside the base of another package. */
export function findTrespasses(posts: PostFile[], reserved: ReservedPath[]): string[] {
    return posts.flatMap((post) => {
        const paths = [post.slug, ...aliasSlugs(post.data)]
        return reserved.flatMap((other) => {
            const inside = paths.find((path) => {
                return path === other.path || path.startsWith(`${other.path}/`)
            })
            return inside === undefined
                ? []
                : [`${post.file} would be served at /${inside}, which ${other.package} serves`]
        })
    })
}

/** Each alias as one of Astro's `redirects`. The source goes without the
 *  deployment base, which Astro adds to it; the target, with it. */
export function aliasRedirects(posts: PostFile[], urls: BlogUrlOptions): Record<string, string> {
    return Object.fromEntries(
        posts.flatMap((post) => {
            const target = blogPageHref(post.slug, urls)
            return aliasSlugs(post.data).map((alias) => {
                const source = blogPageHref(alias, { base: urls.base })
                return [source, target]
            })
        }),
    )
}

/** The lines of a message, indented under its first. */
const indented = (lines: string[]): string => {
    return lines
        .map((line) => {
            return `  ${line}`
        })
        .join('\n')
}

/** Stops the build on what the posts get wrong, each line with its remedy. */
function assertPosts(posts: PostFile[], config: JaabResolvedConfig, reserved: ReservedPath[]): void {
    const errors = postErrors(posts, { authors: Object.keys(config.blog.authors) })
    if (errors.length > 0) {
        throw new Error(`jaab: the posts need fixing\n${indented(errors)}`)
    }

    const trespasses = findTrespasses(posts, reserved)
    if (trespasses.length > 0) {
        throw new Error(
            `jaab: posts inside the pages of another package\n${indented(trespasses)}\n` +
                'Rename the file, or mount the blog elsewhere with routeBase.',
        )
    }
}

/** Until setup knows the posts, a dev server has nothing to watch. */
const watchNothing = (_server: ServerParams['server']): void => {}

/** The blog, on the site `site` sets up, resolved against the project Astro loaded. */
export function createJaabIntegration(options: JaabUserConfig, site: SiteIntegration): AstroIntegration {
    let watchRedirects = watchNothing

    return {
        name: 'jaab',
        hooks: {
            'astro:config:setup': (params: SetupParams) => {
                const { config: astroConfig, updateConfig, injectRoute, logger } = params
                const root = fileURLToPath(astroConfig.root)

                const resolved = resolveConfig(options, {
                    root,
                    publicDir: fileURLToPath(astroConfig.publicDir),
                    srcDir: fileURLToPath(astroConfig.srcDir),
                })
                const hasSite = Boolean(astroConfig.site)
                if (!hasSite && resolved.blog.feed) {
                    logger.warn('site is not set, so the blog has no rss.xml: a feed needs absolute URLs. Set site.')
                }
                const config: JaabResolvedConfig = {
                    ...resolved,
                    blog: {
                        ...resolved.blog,
                        feed: hasSite ? resolved.blog.feed : null,
                        trailingSlash: pageUrlsEndWithSlash(astroConfig),
                    },
                }
                const feed = config.blog.feed !== null
                assertLayout(options, config.blog.layout)

                updateConfig({
                    vite: {
                        plugins: [
                            serialisedModule('jaab:config', 'virtual:jaab/config', () => {
                                return config
                            }),
                            layoutModule(config.blog.layout ?? DEFAULT_LAYOUT),
                        ],
                    },
                })

                const dir = resolve(root, config.blog.dir)
                const posts = existsSync(dir) ? readPostFiles(dir, root) : []
                if (!existsSync(dir)) {
                    logger.warn(
                        `${relative(root, dir)} does not exist, so the blog has no posts. Create it, or set blogDir.`,
                    )
                }

                const linkContext: PostLinkContext = {
                    dir,
                    urls: {
                        base: config.blog.base,
                        deploymentBase: normaliseBasePath(astroConfig.base),
                        trailingSlash: config.blog.trailingSlash,
                    },
                }
                installLinkPlugin(astroConfig.markdown.processor, 'jaab-post-links', (href, from) => {
                    return resolvePostLink(href, from, linkContext)
                })

                const member = siteMember(site)
                const coordinator = siteCoordinator(site)
                assertPosts(posts, config, coordinator.reservedInside(member))

                const routes = getInjectedRoutes(config.blog.base, {
                    llms: config.blog.llms,
                    rootLlms: coordinator.servesRootLlms(member),
                    feed,
                })
                for (const [pattern, entrypoint] of routes) {
                    injectRoute({ pattern, entrypoint: routeEntrypoint(entrypoint), prerender: true })
                }

                watchRedirects = setupRedirects(params, {
                    dirs: [dir],
                    read: () => {
                        return aliasRedirects(existsSync(dir) ? readPostFiles(dir, root) : [], linkContext.urls)
                    },
                })

                coordinator.register(member, {
                    locales: [],
                    routes: routes.map(([pattern]) => {
                        return pattern
                    }),
                    ...(feed ? { feed: { title: config.title, path: `${config.blog.base}/rss.xml` } } : {}),
                })
            },

            'astro:server:setup': ({ server }) => {
                watchRedirects(server)
            },
        },
    }
}
