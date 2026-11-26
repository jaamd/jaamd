import type { SiteResolvedConfig } from './config.ts'
import type { Locale } from './locales.ts'
import type { ReservedPath, SiteEntry, SiteInstance, SiteMember } from './members.ts'
import type { AstroIntegration, AstroUserConfig, IntegrationResolvedRoute } from 'astro'
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import sitemap from '@astrojs/sitemap'
import jaamd from '@jaamd/astro'
import { resolveSiteConfig, resolveStylesheets, shikiTheme } from './config.ts'
import { fonts } from './fonts.ts'
import { inferRepo } from './infer.ts'
import {
    assertOneVersion,
    assertSameOptions,
    assertSeparateBases,
    notFoundPage,
    packageVersion,
    pathsReservedInside,
    rootLlmsServer,
} from './members.ts'
import { toProjectPaths } from './paths.ts'
import { siteVirtualPlugin } from './virtual.ts'

type SetupParams = Parameters<NonNullable<AstroIntegration['hooks']['astro:config:setup']>>[0]
type VitePlugins = NonNullable<NonNullable<AstroUserConfig['vite']>['plugins']>

const NAME = '@jaamd/site'

const VERSION = packageVersion(new URL('../package.json', import.meta.url))

const NOT_INSTALLED = new Set(['MODULE_NOT_FOUND', 'ERR_PACKAGE_PATH_NOT_EXPORTED'])

const PAGE_EXTENSIONS = ['astro', 'md', 'mdx', 'html', 'js', 'ts']

const ENDPOINT_EXTENSIONS = ['js', 'mjs', 'ts', 'mts']

const ROOT_LLMS_FILES = ['llms.txt', 'llms-full.txt']

/** The site's own `@tailwindcss/vite`, unless it already registered one. */
export function loadTailwindPlugin(root: string, registered: VitePlugins | undefined): VitePlugins {
    const plugins = ([registered] as unknown[]).flat(Infinity) as ({
        name?: string
    } | null)[]
    if (
        plugins.some((p) => {
            return p?.name?.startsWith('@tailwindcss/vite')
        })
    ) {
        return []
    }

    const load = createRequire(join(root, 'package.json'))
    let tailwindcss: () => VitePlugins
    try {
        load.resolve('tailwindcss/package.json')
        ;({ default: tailwindcss } = load('@tailwindcss/vite') as {
            default: () => VitePlugins
        })
    } catch (error) {
        if (!NOT_INSTALLED.has((error as { code?: string }).code ?? '')) {
            throw error
        }
        throw new Error(
            'jaad: `tailwind: true` needs Tailwind in your project:\n  npm i -D tailwindcss @tailwindcss/vite',
            { cause: error },
        )
    }
    return tailwindcss()
}

/** What a package registers once Astro has resolved the project. */
export interface SiteContribution {
    /** The languages it serves; the site's are all of them. */
    locales: Locale[]
    /** Patterns of the routes it injected that a project page must not take. */
    routes: string[]
}

/** What the site knows once every package has registered: only the instance
 *  that acts for the site has one. */
export interface SiteCoordinator {
    members: SiteMember[]
    /** Whether `/llms.txt` and `/llms-full.txt` are `member`'s to serve. */
    servesRootLlms(member: SiteMember): boolean
    reservedInside(member: SiteMember): ReservedPath[]
    register(member: SiteMember, contribution: SiteContribution): void
}

interface SiteHandle extends SiteInstance {
    /** The coordinator of the instance acting for the site, set at setup. */
    coordinator: SiteCoordinator | null
}

const HANDLE = 'jaamd:site'

/** The site integration, carrying what its package declared. The handle is
 *  a hook because Astro keeps only the name and the hooks of an integration;
 *  it is looked up by name, so two copies of this package still find each other. */
export interface SiteIntegration extends AstroIntegration {
    hooks: AstroIntegration['hooks'] & { [HANDLE]: () => SiteHandle }
}

const isSiteIntegration = (integration: AstroIntegration): integration is SiteIntegration => {
    return integration.name === NAME && typeof integration.hooks[HANDLE] === 'function'
}

const handleOf = (site: SiteIntegration): SiteHandle => {
    return site.hooks[HANDLE]()
}

const withoutTrailingSlash = (pattern: string): string => {
    return pattern === '' ? '/' : pattern.replace(/(.)\/$/, '$1')
}

/** A file under `src/pages`, or `public` when given, that answers at `path`. */
export function projectFileAt(path: string, extensions: string[], srcDir: URL, publicDir?: URL): string | null {
    const candidates = [
        ...extensions.map((extension) => {
            return new URL(`pages/${path}.${extension}`, srcDir)
        }),
        ...(publicDir ? [new URL(path, publicDir)] : []),
    ]
    const found = candidates.find((candidate) => {
        return existsSync(candidate)
    })
    return found ? fileURLToPath(found) : null
}

/** Each route a package registered, by pattern, with the package. */
function claimedRoutes(contributions: Map<string, SiteContribution>): Map<string, string> {
    return new Map(
        [...contributions].flatMap(([owner, contribution]) => {
            return contribution.routes.map((route): [string, string] => {
                return [withoutTrailingSlash(route), owner]
            })
        }),
    )
}

function coordinatorFor(members: SiteMember[]): {
    coordinator: SiteCoordinator
    contributions: Map<string, SiteContribution>
} {
    const contributions = new Map<string, SiteContribution>()
    const rootLlms = rootLlmsServer(members)

    const coordinator: SiteCoordinator = {
        members,
        servesRootLlms: (member) => {
            return rootLlms === member
        },
        reservedInside: (member) => {
            return pathsReservedInside(members, member)
        },
        register: (member, contribution) => {
            const claimed = claimedRoutes(contributions)
            const taken = contribution.routes.find((route) => {
                return claimed.has(withoutTrailingSlash(route))
            })
            if (taken) {
                throw new Error(
                    `jaamd: ${member.package} and ${claimed.get(withoutTrailingSlash(taken))} both serve ${taken}. ` +
                        'Give each a base of its own.',
                )
            }
            contributions.set(member.package, contribution)
        },
    }
    return { coordinator, contributions }
}

/** Every language of every package, each once, in the order they register. */
function siteLocales(contributions: Map<string, SiteContribution>): Locale[] {
    const byCode = new Map<string, Locale>()
    for (const contribution of contributions.values()) {
        for (const locale of contribution.locales) {
            if (!byCode.has(locale.code)) {
                byCode.set(locale.code, locale)
            }
        }
    }
    return [...byCode.values()]
}

/** The site's own llms files, when no single package serves them, and the
 *  404 of the package at the root, each unless the project has its own. */
function injectRootFiles({ config: astroConfig, injectRoute, logger }: SetupParams, members: SiteMember[]): void {
    if (rootLlmsServer(members) === 'site') {
        const own = ROOT_LLMS_FILES.flatMap((file) => {
            const found = projectFileAt(file, ENDPOINT_EXTENSIONS, astroConfig.srcDir, astroConfig.publicDir)
            return found ? [relative(fileURLToPath(astroConfig.root), found)] : []
        })

        if (own.length > 0) {
            logger.info(`${own.join(' and ')} in the project: the site leaves out its own llms files.`)
        } else {
            for (const file of ROOT_LLMS_FILES) {
                injectRoute({
                    pattern: `/${file}`,
                    entrypoint: fileURLToPath(new URL(`./routes/${file}.ts`, import.meta.url)),
                    prerender: true,
                })
            }
        }
    }

    const notFound = notFoundPage(members)
    if (notFound && !projectFileAt('404', PAGE_EXTENSIONS, astroConfig.srcDir)) {
        injectRoute({ pattern: '/404', entrypoint: notFound, prerender: true })
    }
}

/** What the first site integration of the project, `owner`, sets up once for every
 *  package: JAAMD, the virtual modules, Tailwind, the fonts, the root files
 *  and the sitemap. */
async function setupSite(
    params: SetupParams,
    owner: SiteHandle,
    instances: SiteHandle[],
): Promise<Map<string, SiteContribution>> {
    const { config: astroConfig, updateConfig, logger } = params

    assertOneVersion(instances)
    assertSameOptions(instances)
    const members = instances.map((instance) => {
        return instance.entry.member
    })
    assertSeparateBases(members)

    const { coordinator, contributions } = coordinatorFor(members)
    for (const instance of instances) {
        instance.coordinator = coordinator
    }

    const { options, fonts: fontVariables } = owner.entry
    const paths = toProjectPaths({
        root: fileURLToPath(astroConfig.root),
        publicDir: fileURLToPath(astroConfig.publicDir),
        srcDir: fileURLToPath(astroConfig.srcDir),
    })

    // Run in place rather than added with updateConfig, which would run it after
    // the packages: their markdown plugins and stylesheets come after JAAMD's.
    const markdown = jaamd({ theme: shikiTheme(options) })
    await markdown.hooks['astro:config:setup']?.({ ...params, logger: logger.fork(markdown.name) })

    const inferred = resolveSiteConfig(options, inferRepo(paths.root), paths)
    const siteConfig = (): SiteResolvedConfig => {
        const locales = siteLocales(contributions)
        return {
            ...options,
            ...inferred,
            locales,
            defaultLocale: locales.length > 0 ? options.lang.toLowerCase() : options.lang,
            fonts: fontVariables,
        }
    }
    const llms = members.flatMap((member) => {
        return member.llms ? [{ label: member.label, module: member.llms }] : []
    })

    updateConfig({
        vite: {
            plugins: [
                siteVirtualPlugin(siteConfig, resolveStylesheets(options, paths), llms),
                ...(options.tailwind ? [loadTailwindPlugin(paths.root, astroConfig.vite.plugins)] : []),
            ],
            // Package .astro sources must reach the Astro compiler.
            ssr: {
                noExternal: [
                    NAME,
                    ...members.map((member) => {
                        return member.package
                    }),
                ],
            },
        },
        fonts,
    })

    injectRootFiles(params, members)

    // `site` may come from Astro's own config: read once it is merged.
    if (astroConfig.site) {
        updateConfig({ integrations: [sitemap()] })
    }

    return contributions
}

/** Project pages on a route a package serves: the project's would win in
 *  silence, so the build stops instead. */
export function projectClashes(
    routes: Pick<IntegrationResolvedRoute, 'pattern' | 'origin' | 'entrypoint'>[],
    contributions: Map<string, SiteContribution>,
): string[] {
    const claimed = claimedRoutes(contributions)

    return routes.flatMap((route) => {
        const owner = claimed.get(withoutTrailingSlash(route.pattern))
        if (route.origin !== 'project' || !owner) {
            return []
        }
        return [`${route.entrypoint} takes ${route.pattern}, which ${owner} serves`]
    })
}

/**
 * The integration every package of the site includes before its own. The
 * first in the project acts for all of them: it checks that they agree, then
 * sets up what a site has once. The others only point their package at it.
 */
export function siteIntegration(entry: SiteEntry): SiteIntegration {
    const handle: SiteHandle = { version: VERSION, entry, coordinator: null }
    let contributions: Map<string, SiteContribution> | null = null
    let command = 'build'

    return {
        name: NAME,
        hooks: {
            [HANDLE]: () => {
                return handle
            },

            'astro:config:setup': async (params) => {
                const instances = params.config.integrations.filter(isSiteIntegration)
                if (!instances[0] || handleOf(instances[0]) !== handle) {
                    return
                }

                command = params.command
                const handles = instances.map((instance) => {
                    return handleOf(instance)
                })
                contributions = await setupSite(params, handle, handles)
            },

            'astro:routes:resolved': ({ routes, logger }) => {
                if (!contributions) {
                    return
                }

                const clashes = projectClashes(routes, contributions)
                if (clashes.length === 0) {
                    return
                }

                const list = clashes
                    .map((clash) => {
                        return `  ${clash}`
                    })
                    .join('\n')
                const message =
                    `a project page takes a route of the site\n${list}\n` +
                    'Rename the page, or move the package with its base option.'

                // A dev server stays up while the page is renamed.
                if (command === 'dev') {
                    logger.error(message)
                    return
                }
                throw new Error(`jaamd: ${message}`)
            },
        },
    }
}

/** What the package that created `site` declared. */
export function siteMember(site: SiteIntegration): SiteMember {
    return handleOf(site).entry.member
}

/** The coordinator of the site `site` belongs to, once its setup has run. */
export function siteCoordinator(site: SiteIntegration): SiteCoordinator {
    const { coordinator, entry } = handleOf(site)
    if (!coordinator) {
        throw new Error(`jaamd: ${entry.member.package} was set up before its site integration.`)
    }
    return coordinator
}
