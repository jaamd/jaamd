import type { JaadResolvedConfig } from '../config.ts'
import type { DocsRoot } from './config.ts'
import type { DocLinkContext } from './links.ts'
import type { DocsPage } from './model/tree.ts'
import type { ReservedPath } from '@jaamd/site/members.ts'
import type { AstroIntegration } from 'astro'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { prefixedLocales } from '@jaamd/site/locales.ts'
import { normaliseBasePath } from '@jaamd/site/urls.ts'
import { docsRoots } from './config.ts'
import { rehypeDocLinks, satteriDocLinks } from './link-plugins.ts'
import { readFrontmatter } from './model/frontmatter.ts'
import { getDocCollectionId, splitDocLocale } from './model/ids.ts'
import { buildDocsTree, type DocsSource } from './model/tree.ts'
import { docsPageHref, type DocsUrlOptions } from './urls.ts'

type SetupParams = Parameters<NonNullable<AstroIntegration['hooks']['astro:config:setup']>>[0]

const DOCS_FRAME_ID = 'virtual:jaad/docs-frame'
const RESOLVED_DOCS_FRAME = '\0' + DOCS_FRAME_ID

/** The frame around every docs page: the project's own, or JAAD's. */
function docsFrameVirtualPlugin(docsFrame: () => string) {
    return {
        name: 'jaad:docs-frame',
        resolveId: (source: string) => {
            return source === DOCS_FRAME_ID ? RESOLVED_DOCS_FRAME : null
        },
        load: (id: string) => {
            return id === RESOLVED_DOCS_FRAME ? `export { default } from ${JSON.stringify(docsFrame())};` : null
        },
    }
}

/** A named url that redirects to its page's canonical one. */
export interface DocsAlias {
    locale?: string
    slug: string
}

export interface IntegrationState {
    deploymentBase: string
    aliases: DocsAlias[]
    docsFrame: string
}

const INDEX_PAGE_NAMES = ['index.astro', 'index.md', 'index.mdx', 'index.html', 'index.js', 'index.ts']

/** A plugin this integration registered on an earlier setup run. */
const isDocLinks = (plugin: unknown): boolean => {
    return (
        (typeof plugin === 'function' || (typeof plugin === 'object' && plugin !== null)) &&
        ['jaad-doc-links', 'jaadDocLinks'].includes((plugin as { name?: string }).name ?? '')
    )
}

const routeEntrypoint = (file: string) => {
    return fileURLToPath(new URL(`./routes/${file}`, import.meta.url))
}

/** A page read from disk, with the file it was read from. */
interface DiskSource extends DocsSource {
    file: string
}

/** The pages of every locale. The content collection is not available this
 *  early, so they are read from disk. */
function readDocsTrees(
    roots: DocsRoot[],
    locales: string[],
): { locale: string | undefined; pages: DocsPage<DiskSource>[] }[] {
    const sources: DiskSource[] = []

    const visit = (root: DocsRoot, current: string) => {
        for (const entry of readdirSync(current, { withFileTypes: true }).toSorted((a, b) => {
            return a.name.localeCompare(b.name)
        })) {
            const file = join(current, entry.name)
            if (entry.isDirectory()) {
                visit(root, file)
            } else if (entry.isFile() && entry.name.endsWith('.md')) {
                const front = readFrontmatter(readFileSync(file, 'utf8'))
                if (front.draft) {
                    continue
                }

                const { locale, id } = splitDocLocale(getDocCollectionId(relative(root.dir, file)), locales)
                sources.push({
                    file,
                    id,
                    path: id,
                    locale: locale ?? undefined,
                    section: root.section,
                    data: { order: front.order },
                })
            }
        }
    }
    for (const root of roots) {
        if (existsSync(root.dir)) {
            visit(root, root.dir)
        }
    }

    const sections = roots.flatMap((root) => {
        return root.section ?? []
    })
    return (locales.length > 0 ? locales : [undefined]).map((locale) => {
        // The slugs are all that is read: the urls need no mount.
        const tree = buildDocsTree(
            sources.filter((source) => {
                return source.locale === locale
            }),
            { sections, urls: { docsBase: '' } },
        )
        return { locale, pages: tree.pages }
    })
}

/** The aliases of every locale. */
export function findAliases(roots: DocsRoot[], locales: string[] = []): DocsAlias[] {
    return readDocsTrees(roots, locales).flatMap(({ locale, pages }) => {
        return pages.flatMap((page) => {
            return page.aliases.map((slug) => {
                return { locale, slug }
            })
        })
    })
}

/** A page served inside the base of another package. */
export interface DocsTrespass {
    file: string
    /** Below the docs mount. */
    path: string
    package: string
}

/** The pages whose url, or one of its aliases, falls inside another
 *  package's base. `defaultLocale` is the one served without a prefix. */
export function findTrespasses(
    roots: DocsRoot[],
    locales: string[],
    defaultLocale: string,
    reserved: ReservedPath[],
): DocsTrespass[] {
    if (reserved.length === 0) {
        return []
    }

    return readDocsTrees(roots, locales).flatMap(({ locale, pages }) => {
        const prefix = locale && locale !== defaultLocale ? `${locale}/` : ''

        return pages.flatMap((page) => {
            const paths = [page.canonical, ...page.aliases].map((slug) => {
                return `${prefix}${slug}`.replace(/\/$/, '')
            })

            return reserved.flatMap((other) => {
                const inside = paths.find((path) => {
                    return path === other.path || path.startsWith(`${other.path}/`)
                })
                return inside === undefined ? [] : [{ file: page.source.file, path: inside, package: other.package }]
            })
        })
    })
}

/** `rootLlms` false leaves the default-language llms files out of a docs
 *  mount at the root, where the site serves its own. */
export function getInjectedRoutes(
    docsBase: string,
    locales: string[] = [],
    llms: boolean = true,
    rootLlms: boolean = true,
): [string, string][] {
    const llmsRoutes: [string, string][] =
        llms && (docsBase !== '' || rootLlms)
            ? [
                  [`${docsBase}/llms.txt`, 'llms.txt.ts'],
                  [`${docsBase}/llms-full.txt`, 'llms-full.txt.ts'],
              ]
            : []

    // `[...slug]` already absorbs "it/guide" and "it". Only the fixed
    // endpoints need a route of their own, and `[locale]` hands them the code.
    const perLocale: [string, string][] =
        locales.length > 0
            ? [
                  [`${docsBase}/[locale]/search-index.json`, 'search-index-locale.json.ts'],
                  ...(llms
                      ? ([
                            [`${docsBase}/[locale]/llms.txt`, 'llms-locale.txt.ts'],
                            [`${docsBase}/[locale]/llms-full.txt`, 'llms-full-locale.txt.ts'],
                        ] as [string, string][])
                      : []),
              ]
            : []

    return [
        [docsBase, 'docs-index.astro'],
        [`${docsBase}/search-index.json`, 'search-index.json.ts'],
        ...llmsRoutes,
        ...perLocale,
        [`${docsBase}/[...slug]`, 'docs-slug.astro'],
        [`${docsBase}/[...slug].md`, 'docs-slug.md.ts'],
    ]
}

export function createIntegrationState(): IntegrationState {
    return {
        deploymentBase: '',
        aliases: [],
        docsFrame: fileURLToPath(new URL('./layouts/DefaultDocsFrame.astro', import.meta.url)),
    }
}

export interface DocsSetupOptions {
    /** Read the aliases from disk, for the sitemap to leave out. */
    discoverAliases: boolean
    /** Whether the root llms files are the docs' to serve. */
    rootLlms: boolean
    /** What other packages own inside the docs mount. */
    reserved: ReservedPath[]
}

/** Routes, the docs frame, aliases and the link plugins. Returns the patterns
 *  of the routes a project page must not take. */
export function setupDocs(
    { config: astroConfig, updateConfig, injectRoute, addWatchFile, logger }: SetupParams,
    config: JaadResolvedConfig,
    state: IntegrationState,
    { discoverAliases, rootLlms, reserved }: DocsSetupOptions,
): string[] {
    updateConfig({
        vite: {
            plugins: [
                docsFrameVirtualPlugin(() => {
                    return state.docsFrame
                }),
            ],
        },
    })

    const routes = getInjectedRoutes(
        config.docs.base,
        prefixedLocales(config.locales, config.defaultLocale),
        config.docs.llms,
        rootLlms,
    )
    for (const [pattern, entrypoint] of routes) {
        injectRoute({
            pattern,
            entrypoint: routeEntrypoint(entrypoint),
            prerender: true,
        })
    }

    const customDocsFrame = new URL('jaad/DocsFrame.astro', astroConfig.srcDir)
    if (existsSync(customDocsFrame)) {
        state.docsFrame = fileURLToPath(customDocsFrame)
        addWatchFile(customDocsFrame)
    }

    const root = fileURLToPath(astroConfig.root)
    const roots = docsRoots(config.docs, root)
    const locales = config.locales.map((locale) => {
        return locale.code
    })

    const missing = roots.filter(({ dir }) => {
        return !existsSync(dir)
    })
    for (const { dir } of missing) {
        logger.warn(
            `${relative(root, dir)} does not exist, so it adds no pages. ` +
                'Create it, or point docsDir or the section at your markdown.',
        )
    }
    if (discoverAliases && missing.length < roots.length) {
        state.aliases = findAliases(roots, locales)
    }

    const trespasses = findTrespasses(roots, locales, config.defaultLocale, reserved)
    if (trespasses.length > 0) {
        const lines = trespasses.map((trespass) => {
            const url = `${config.docs.base}/${trespass.path}`
            return `  ${relative(root, trespass.file)} would be served at ${url}, which ${trespass.package} serves`
        })
        throw new Error(
            `jaad: docs pages inside the pages of another package\n${lines.join('\n')}\n` +
                'Rename the file or its directory, or mount the docs elsewhere with routeBase.',
        )
    }
    for (const { dir } of roots) {
        addWatchFile(pathToFileURL(dir))
    }

    const warnedDrafts = new Set<string>()
    const links: DocLinkContext = {
        roots,
        locales,
        onDraftLink(from, href) {
            const key = `${from}\0${href}`
            if (warnedDrafts.has(key)) {
                return
            }
            warnedDrafts.add(key)
            logger.warn(`${relative(root, from)} links to ${href}, a draft: a production build leaves it out.`)
        },
        urls: (locale?: string): DocsUrlOptions => {
            return {
                docsBase: config.docs.base,
                deploymentBase: normaliseBasePath(astroConfig.base),
                locale,
                defaultLocale: config.defaultLocale,
                trailingSlash: config.docs.trailingSlash,
            }
        },
    }
    // New arrays: a shared processor would stack duplicates across setup runs.
    const processor = astroConfig.markdown.processor as {
        name: string
        options: { hastPlugins?: unknown[]; rehypePlugins?: unknown[] }
    }
    if (processor.name === 'satteri') {
        processor.options.hastPlugins = [
            ...(processor.options.hastPlugins ?? []).filter((plugin) => {
                return !isDocLinks(plugin)
            }),
            satteriDocLinks(links),
        ]
    } else if (processor.name === 'unified') {
        processor.options.rehypePlugins = [
            ...(processor.options.rehypePlugins ?? []).filter((plugin) => {
                return !isDocLinks(plugin)
            }),
            rehypeDocLinks(links),
        ]
    }

    if (config.docs.base === '') {
        const ownIndex = INDEX_PAGE_NAMES.find((name) => {
            return existsSync(new URL(`pages/${name}`, astroConfig.srcDir))
        })
        if (ownIndex) {
            logger.warn(
                `${ownIndex} owns the site root while JAAD docs are mounted there. ` +
                    'Set routeBase: "/docs" to keep a landing page and mount the docs below it.',
            )
        }
    }

    // The docs index is left out: a landing page of the project's own has long
    // been allowed to take it, with the warning above.
    return routes.flatMap(([pattern, entrypoint]) => {
        return entrypoint === 'docs-index.astro' ? [] : [pattern]
    })
}

const withoutTrailingSlash = (value: string) => {
    return value.length > 1 ? value.replace(/\/$/, '') : value
}

export function createSitemapFilter(
    docsBase: string,
    state: Pick<IntegrationState, 'deploymentBase' | 'aliases'>,
    defaultLocale?: string,
): (page: string) => boolean {
    return (page) => {
        if (state.aliases.length === 0) {
            return true
        }

        const pathname = withoutTrailingSlash(new URL(page).pathname)
        return !state.aliases.some((alias) => {
            const urls: DocsUrlOptions = {
                docsBase,
                deploymentBase: state.deploymentBase,
                locale: alias.locale,
                defaultLocale,
            }
            return pathname === withoutTrailingSlash(docsPageHref(alias.slug, urls))
        })
    }
}
