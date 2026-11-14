import type { JaadResolvedConfig } from '../config.ts'
import type { DocsRoot } from './config.ts'
import type { AstroIntegration } from 'astro'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { prefixedLocales } from '../site/locales.ts'
import { normaliseBasePath } from '../site/urls.ts'
import { docsRoots } from './config.ts'
import { rehypeDocLinks, satteriDocLinks } from './link-plugins.ts'
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
        resolveId: (source: string) => (source === DOCS_FRAME_ID ? RESOLVED_DOCS_FRAME : null),
        load: (id: string) =>
            id === RESOLVED_DOCS_FRAME ? `export { default } from ${JSON.stringify(docsFrame())};` : null,
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
    const sources: DocsSource[] = []

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
                sources.push({
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
        if (existsSync(root.dir)) visit(root, root.dir)
    }

    const sections = roots.flatMap((root) => root.section ?? [])
    return (locales.length > 0 ? locales : [undefined]).flatMap((locale) => {
        // The slugs are all that is read: the urls need no mount.
        const tree = buildDocsTree(
            sources.filter((source) => source.locale === locale),
            { sections, urls: { docsBase: '' } },
        )
        return tree.pages.flatMap((page) => page.aliases.map((slug) => ({ locale, slug })))
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

/** Routes, the docs frame, the 404 page, aliases and the link plugins. */
export function setupDocs(
    { config: astroConfig, updateConfig, injectRoute, addWatchFile, logger }: SetupParams,
    config: JaadResolvedConfig,
    state: IntegrationState,
    discoverAliases: boolean,
): void {
    updateConfig({ vite: { plugins: [docsFrameVirtualPlugin(() => state.docsFrame)] } })

    for (const [pattern, entrypoint] of getInjectedRoutes(
        config.docs.base,
        prefixedLocales(config.locales, config.defaultLocale),
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

    if (shouldInjectNotFound(config.docs.base, astroConfig.srcDir)) {
        injectRoute({
            pattern: '/404',
            entrypoint: routeEntrypoint('404.astro'),
            prerender: true,
        })
    }

    const root = fileURLToPath(astroConfig.root)
    const roots = docsRoots(config.docs, root)
    const locales = config.locales.map((locale) => locale.code)

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
            docsBase: config.docs.base,
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

    if (config.docs.base === '') {
        const ownIndex = INDEX_PAGE_NAMES.find((name) => existsSync(new URL(`pages/${name}`, astroConfig.srcDir)))
        if (ownIndex) {
            logger.warn(
                `${ownIndex} owns the site root while JAAD docs are mounted there. ` +
                    'Set routeBase: "/docs" to keep a landing page and mount the docs below it.',
            )
        }
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
