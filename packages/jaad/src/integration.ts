import type { JaadResolvedConfig } from './config.ts'
import type { IntegrationState } from './docs/integration.ts'
import type { SiteStylesheets } from './site/virtual.ts'
import type { AstroIntegration } from 'astro'
import { setupDocs } from './docs/integration.ts'
import { setupSite } from './site/integration.ts'
import { normaliseBasePath } from './site/urls.ts'

/** The site, then the docs on it. */
export function createJaadIntegration(
    config: JaadResolvedConfig,
    stylesheets: SiteStylesheets,
    state: IntegrationState,
    discoverAliases: boolean,
): AstroIntegration {
    return {
        name: 'jaad',
        hooks: {
            'astro:config:setup': (params) => {
                setupSite(params, config, stylesheets)
                setupDocs(params, config, state, discoverAliases)
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
