import type { AstroIntegration } from 'astro'
import sitemap from '@astrojs/sitemap'
import jaamd from '@jaamd/astro'
import { resolveConfig, type JaadUserConfig } from './src/config.ts'
import { createIntegrationState, createSitemapFilter } from './src/docs/integration.ts'
import { createJaadIntegration } from './src/integration.ts'
import { resolveStylesheets } from './src/site/config.ts'

/** The whole set: Astro flattens nested arrays in `integrations`. */
export default function jaad(options: JaadUserConfig): AstroIntegration[] {
    const config = resolveConfig(options)
    const css = resolveStylesheets(config)
    const state = createIntegrationState()
    const core = createJaadIntegration(config, css, state, Boolean(options.site))

    // Without `site` the sitemap integration can only warn and skip.
    return [
        jaamd({ theme: config.shiki }),
        ...(options.site
            ? [
                  sitemap({
                      filter: createSitemapFilter(config.docs.base, state, config.defaultLocale),
                  }),
              ]
            : []),
        core,
    ]
}

export { defineJaadConfig } from './src/config.ts'
export type { JaadUserConfig } from './src/config.ts'
