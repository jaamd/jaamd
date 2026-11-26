import { ASTRO_OPTIONS, fontVariables, type AstroOptions } from '@jaamd/site/astro-config.ts'
import { resolveSiteConfig, siteConfigShape, siteOptionsOf, type SiteResolvedConfig } from '@jaamd/site/config.ts'
import { inferRepo } from '@jaamd/site/infer.ts'
import { describeLocale } from '@jaamd/site/locales.ts'
import { parseOptions } from '@jaamd/site/options.ts'
import { toProjectPaths, type ProjectPaths } from '@jaamd/site/paths.ts'
import { z } from 'astro/zod'
import { docsConfigShape, resolveDocsConfig, type DocsResolvedConfig } from './docs/config.ts'

/** Site options, then docs options: the order the error for an unknown one lists them. */
export const jaadConfigSchema = z.object({ ...siteConfigShape, ...docsConfigShape })

export type JaadConfig = z.output<typeof jaadConfigSchema>

export type JaadUserConfig = z.input<typeof jaadConfigSchema> & AstroOptions

/** What the components read: the site's fields at the top, the docs' under `docs`. */
export interface JaadResolvedConfig extends SiteResolvedConfig {
    docs: DocsResolvedConfig
}

/** The options, checked: an unknown or invalid one stops the config from loading. */
export function parseConfig(options: JaadUserConfig): JaadConfig {
    return parseOptions(jaadConfigSchema, options, { product: 'jaad', forwarded: ASTRO_OPTIONS })
}

/** The config with what the project tells: repository, locales, public assets.
 *  `project` is a root, or the directories Astro resolved. */
export function resolveConfig(
    options: JaadUserConfig,
    project: ProjectPaths | string = process.cwd(),
): JaadResolvedConfig {
    const paths = toProjectPaths(project)
    const config = parseConfig(options)
    const repo = inferRepo(paths.root)
    const { docs, locales } = resolveDocsConfig(config, config.lang, options.docsDir !== undefined, repo, paths.root)
    const siteOptions = siteOptionsOf(config)

    return {
        ...siteOptions,
        ...resolveSiteConfig(siteOptions, repo, paths),
        locales: locales.map(describeLocale),
        defaultLocale: locales.length > 0 ? config.lang.toLowerCase() : config.lang,
        fonts: fontVariables(options),
        docs,
    }
}

/** Identity helper, for a typed `jaad.config.ts`. */
export function defineJaadConfig(config: JaadUserConfig): JaadUserConfig {
    return config
}
