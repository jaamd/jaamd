import type { JaadUserConfig } from './config.ts'
import type { IntegrationState } from './docs/integration.ts'
import type { SiteIntegration } from '@jaamd/site/integration.ts'
import type { AstroIntegration } from 'astro'
import { fileURLToPath } from 'node:url'
import { siteCoordinator, siteMember } from '@jaamd/site/integration.ts'
import { normaliseBasePath } from '@jaamd/site/urls.ts'
import { serialisedModule } from '@jaamd/site/virtual.ts'
import { resolveConfig } from './config.ts'
import { createSitemapFilter, setupDocs } from './docs/integration.ts'
import { pageUrlsEndWithSlash } from './docs/urls.ts'

/** The docs, on the site `site` sets up, resolved against the project Astro loaded. */
export function createJaadIntegration(
    options: JaadUserConfig,
    state: IntegrationState,
    site: SiteIntegration,
): AstroIntegration {
    return {
        name: 'jaad',
        hooks: {
            'astro:config:setup': (params) => {
                const { config: astroConfig, updateConfig, logger } = params
                const paths = {
                    root: fileURLToPath(astroConfig.root),
                    publicDir: fileURLToPath(astroConfig.publicDir),
                    srcDir: fileURLToPath(astroConfig.srcDir),
                }

                const resolved = resolveConfig(options, paths)
                const config = {
                    ...resolved,
                    docs: { ...resolved.docs, trailingSlash: pageUrlsEndWithSlash(astroConfig) },
                }
                const hasSite = Boolean(astroConfig.site)
                if (!hasSite && config.docs.llms) {
                    logger.warn(
                        'site is not set, so llms.txt and the Markdown of each page link with relative URLs, ' +
                            'which an agent reading them elsewhere cannot follow. Set site to the public URL.',
                    )
                }

                updateConfig({
                    vite: { plugins: [serialisedModule('jaad:config', 'virtual:jaad/config', () => config)] },
                })

                const member = siteMember(site)
                const coordinator = siteCoordinator(site)
                const routes = setupDocs(params, config, state, {
                    discoverAliases: hasSite,
                    rootLlms: coordinator.servesRootLlms(member),
                    reserved: coordinator.reservedInside(member),
                })

                coordinator.register(member, {
                    locales: config.locales,
                    routes,
                    sitemapFilter: createSitemapFilter(config.docs.base, state, config.defaultLocale),
                })
            },

            'astro:config:done': ({ config: astroConfig }) => {
                state.deploymentBase = normaliseBasePath(astroConfig.base)
            },
        },
    }
}
