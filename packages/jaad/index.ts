import type { AstroIntegration } from 'astro'
import sitemap from '@astrojs/sitemap'
import jaamd from '@jaamd/astro'
import { defineConfig } from 'astro/config'
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

/** The whole Astro config for a JAAD site. `astro` is merged in, with its
 *  integrations appended rather than replacing ours. */
export function defineJaadSite(options: JaadUserConfig) {
    const { site, base, astro } = options
    const extra = astro ?? {}
    const extraIntegrations = Array.isArray(extra.integrations) ? (extra.integrations as AstroIntegration[]) : []

    return defineConfig({
        ...(site ? { site } : {}),
        ...(base ? { base } : {}),
        ...extra,
        integrations: [...jaad(options), ...extraIntegrations],
    })
}

export { defineJaadConfig } from './src/config.ts'
export type { JaadUserConfig, JaadConfig, JaadResolvedConfig } from './src/config.ts'
