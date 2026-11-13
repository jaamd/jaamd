import type { DocsRoot, JaadResolvedConfig, resolveStylesheets } from './config.ts'
import type { AstroIntegration, AstroUserConfig } from 'astro'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join, relative } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { docsRoots } from './config.ts'
import { fonts } from './fonts.ts'
import { rehypeDocLinks, satteriDocLinks } from './link-plugins.ts'
import { prefixedLocales } from './locales.ts'
import { docsPageHref, normaliseBasePath, type DocsUrlOptions } from './urls.ts'
import { docAliases, getDocCollectionId, sortDocPages, splitDocLocale, type DocsPageLike } from './utils/docs.ts'
import { jaadVirtualPlugin } from './virtual.ts'

type Stylesheets = ReturnType<typeof resolveStylesheets>
type VitePlugins = NonNullable<NonNullable<AstroUserConfig['vite']>['plugins']>

const NOT_INSTALLED = new Set(['MODULE_NOT_FOUND', 'ERR_PACKAGE_PATH_NOT_EXPORTED'])

/** The site's own `@tailwindcss/vite`, unless it already registered one. */
export function loadTailwindPlugin(root: string, registered: VitePlugins | undefined): VitePlugins {
    const plugins = ([registered] as unknown[]).flat(Infinity) as ({
        name?: string
    } | null)[]
    if (plugins.some((p) => p?.name?.startsWith('@tailwindcss/vite'))) return []

    const load = createRequire(join(root, 'package.json'))
    let tailwindcss: () => VitePlugins
    try {
        load.resolve('tailwindcss/package.json')
        ;({ default: tailwindcss } = load('@tailwindcss/vite') as {
            default: () => VitePlugins
        })
    } catch (error) {
        if (!NOT_INSTALLED.has((error as { code?: string }).code ?? '')) throw error
        throw new Error(
            'jaad: `tailwind: true` needs Tailwind in your project:\n  npm i -D tailwindcss @tailwindcss/vite',
            { cause: error },
        )
    }
    return tailwindcss()
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

const NOT_FOUND_PAGE_NAMES = ['404.astro', '404.md', '404.mdx', '404.html', '404.js', '404.ts']

/** A plugin this integration registered on an earlier setup run. */
const isDocLinks = (plugin: unknown): boolean =>
    (typeof plugin === 'function' || (typeof plugin === 'object' && plugin !== null)) &&
    ['jaad-doc-links', 'jaadDocLinks'].includes((plugin as { name?: string }).name ?? '')

const routeEntrypoint = (file: string) => fileURLToPath(new URL(`./routes/${file}`, import.meta.url))

export function shouldInjectNotFound(docsBase: string, srcDir: URL): boolean {
    return docsBase === '' && !NOT_FOUND_PAGE_NAMES.some((name) => existsSync(new URL(`pages/${name}`, srcDir)))
}

/** The two fields that move the first page of the docs or of a section. */
function readFrontmatter(source: string): { order?: number; draft?: boolean } {
    const block = /^---\r?\n([\s\S]*?)\r?\n---/.exec(source)
    if (!block) return {}

    const order = /^order:\s*(-?\d+)\s*$/m.exec(block[1])
    const draft = /^draft:\s*(true|false)\s*$/m.exec(block[1])
    return {
        order: order ? Number(order[1]) : undefined,
        draft: draft ? draft[1] === 'true' : undefined,
    }
}

/** The aliases of every locale. The content collection is not available this
 *  early, so the pages are read from disk. */
export function findAliases(roots: DocsRoot[], locales: string[] = []): DocsAlias[] {
    const pages: (DocsPageLike & { locale: string | null })[] = []

    const visit = (root: DocsRoot, current: string) => {
        for (const entry of readdirSync(current, { withFileTypes: true }).toSorted((a, b) =>
            a.name.localeCompare(b.name),
        )) {
            const file = join(current, entry.name)
            if (entry.isDirectory()) visit(root, file)
            else if (entry.isFile() && entry.name.endsWith('.md')) {
                const front = readFrontmatter(readFileSync(file, 'utf8'))
                if (front.draft) continue

                const { locale, id } = splitDocLocale(getDocCollectionId(relative(root.dir, file)), locales)
                pages.push({ id, locale, section: root.section, data: { order: front.order } })
            }
        }
    }
    for (const root of roots) {
        if (existsSync(root.dir)) visit(root, root.dir)
    }

    const sections = roots.flatMap((root) => root.section ?? [])
    return (locales.length > 0 ? locales : [null]).flatMap((locale) => {
        const sorted = sortDocPages(
            pages.filter((page) => page.locale === locale),
            sections,
        )
        return sorted
            .flatMap((page, index) => docAliases(page, index, sorted))
            .map((slug) => ({ locale: locale ?? undefined, slug }))
    })
}

export function getInjectedRoutes(docsBase: string, locales: string[] = []): [string, string][] {
    // `[...slug]` already absorbs "it/guide" and "it". Only the two fixed
    // endpoints need a route of their own, and `[locale]` hands them the code.
    const perLocale: [string, string][] =
        locales.length > 0
            ? [
                  [`${docsBase}/[locale]/search-index.json`, 'search-index-locale.json.ts'],
                  [`${docsBase}/[locale]/llms.txt`, 'llms-locale.txt.ts'],
              ]
            : []

    return [
        [docsBase, 'docs-index.astro'],
        [`${docsBase}/search-index.json`, 'search-index.json.ts'],
        [`${docsBase}/llms.txt`, 'llms.txt.ts'],
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

export function createCoreIntegration(
    config: JaadResolvedConfig,
    stylesheets: Stylesheets,
    state: IntegrationState,
    discoverAliases: boolean,
): AstroIntegration {
    return {
        name: 'jaad',
        hooks: {
            'astro:config:setup': ({ config: astroConfig, updateConfig, injectRoute, addWatchFile, logger }) => {
                updateConfig({
                    vite: {
                        plugins: [
                            jaadVirtualPlugin(
                                config,
                                stylesheets.user,
                                stylesheets.theme,
                                stylesheets.bridge,
                                stylesheets.tailwind,
                                () => state.docsFrame,
                            ),
                            ...(config.tailwind
                                ? [loadTailwindPlugin(fileURLToPath(astroConfig.root), astroConfig.vite.plugins)]
                                : []),
                        ],
                        // Package .astro sources must reach the Astro compiler.
                        ssr: { noExternal: ['@jaamd/jaad'] },
                    },
                    fonts,
                })

                for (const [pattern, entrypoint] of getInjectedRoutes(
                    config.docsBase,
                    prefixedLocales(config.docsLocales, config.defaultLocale),
                )) {
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

                if (shouldInjectNotFound(config.docsBase, astroConfig.srcDir)) {
                    injectRoute({
                        pattern: '/404',
                        entrypoint: routeEntrypoint('404.astro'),
                        prerender: true,
                    })
                }

                const root = fileURLToPath(astroConfig.root)
                const roots = docsRoots(config, root)
                const locales = config.docsLocales.map((locale) => locale.code)

                const missing = roots.filter(({ dir }) => !existsSync(dir))
                for (const { dir } of missing) {
                    logger.warn(
                        `${relative(root, dir)} does not exist, so it adds no pages. ` +
                            'Create it, or point docsDir or the section at your markdown.',
                    )
                }
                if (discoverAliases && missing.length < roots.length) {
                    state.aliases = findAliases(roots, locales)
                }
                for (const { dir } of roots) addWatchFile(pathToFileURL(dir))

                const links = {
                    roots,
                    locales,
                    urls: (locale?: string): DocsUrlOptions => ({
                        docsBase: config.docsBase,
                        deploymentBase: normaliseBasePath(astroConfig.base),
                        locale,
                        defaultLocale: config.defaultLocale,
                    }),
                }
                // New arrays: a shared processor would stack duplicates across setup runs.
                const processor = astroConfig.markdown.processor as {
                    name: string
                    options: { hastPlugins?: unknown[]; rehypePlugins?: unknown[] }
                }
                if (processor.name === 'satteri') {
                    processor.options.hastPlugins = [
                        ...(processor.options.hastPlugins ?? []).filter((plugin) => !isDocLinks(plugin)),
                        satteriDocLinks(links),
                    ]
                } else if (processor.name === 'unified') {
                    processor.options.rehypePlugins = [
                        ...(processor.options.rehypePlugins ?? []).filter((plugin) => !isDocLinks(plugin)),
                        rehypeDocLinks(links),
                    ]
                }

                if (config.docsBase === '') {
                    const ownIndex = INDEX_PAGE_NAMES.find((name) =>
                        existsSync(new URL(`pages/${name}`, astroConfig.srcDir)),
                    )
                    if (ownIndex) {
                        logger.warn(
                            `${ownIndex} owns the site root while JAAD docs are mounted there. ` +
                                'Set routeBase: "/docs" to keep a landing page and mount the docs below it.',
                        )
                    }
                }
            },

            'astro:config:done': ({ config: astroConfig, injectTypes }) => {
                state.deploymentBase = normaliseBasePath(astroConfig.base)
                injectTypes({
                    filename: 'jaad.d.ts',
                    content: `declare module "virtual:jaad/config" {
  const config: import("@jaamd/jaad").JaadResolvedConfig;
  export default config;
}`,
                })
            },
        },
    }
}

const withoutTrailingSlash = (value: string) => (value.length > 1 ? value.replace(/\/$/, '') : value)

export function createSitemapFilter(
    docsBase: string,
    state: Pick<IntegrationState, 'deploymentBase' | 'aliases'>,
    defaultLocale?: string,
): (page: string) => boolean {
    return (page) => {
        if (state.aliases.length === 0) return true

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
