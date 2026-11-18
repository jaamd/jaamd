import type { JaadUserConfig } from './config.ts'
import type { IntegrationState } from './docs/integration.ts'
import type { AstroIntegration } from 'astro'
import { fileURLToPath } from 'node:url'
import sitemap from '@astrojs/sitemap'
import { resolveConfig } from './config.ts'
import { createSitemapFilter, setupDocs } from './docs/integration.ts'
import { pageUrlsEndWithSlash } from './docs/urls.ts'
import { resolveStylesheets } from './site/config.ts'
import { setupSite } from './site/integration.ts'
import { normaliseBasePath } from './site/urls.ts'

/** The site, then the docs on it, resolved against the project Astro loaded. */
export function createJaadIntegration(options: JaadUserConfig, state: IntegrationState): AstroIntegration {
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

                setupSite(params, config, resolveStylesheets(config, paths))
                setupDocs(params, config, state, hasSite)

                // `site` may come from Astro's own config: read once it is merged.
                if (hasSite) {
                    const filter = createSitemapFilter(config.docs.base, state, config.defaultLocale)
                    updateConfig({ integrations: [sitemap({ filter })] })
                }
            },

            'astro:config:done': ({ config: astroConfig }) => {
                state.deploymentBase = normaliseBasePath(astroConfig.base)
            },
        },
    }
}
