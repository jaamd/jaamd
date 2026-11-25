import type { AstroUserConfig, FontProvider, Locales, SessionDriverConfig } from 'astro'
import { resolveSiteConfig, siteConfigShape, type SiteConfig, type SiteResolvedConfig } from '@jaamd/site/config.ts'
import { inferRepo } from '@jaamd/site/infer.ts'
import { describeLocale } from '@jaamd/site/locales.ts'
import { toProjectPaths, type ProjectPaths } from '@jaamd/site/paths.ts'
import { z } from 'astro/zod'
import { docsConfigShape, resolveDocsConfig, type DocsResolvedConfig } from './docs/config.ts'

/** Site options, then docs options: the order the error for an unknown one lists them. */
export const jaadConfigSchema = z.object({ ...siteConfigShape, ...docsConfigShape })

export type JaadConfig = z.output<typeof jaadConfigSchema>

/** Out of the schema, so `parse` strips them: the resolved config is
 *  serialised and an integration is not. */
type AstroPassthroughConfig = AstroUserConfig<Locales, string | SessionDriverConfig | undefined, FontProvider[]>

export type JaadUserConfig = z.input<typeof jaadConfigSchema> & {
    site?: string
    base?: string
    astro?: AstroPassthroughConfig
}

/** What the components read: the site's fields at the top, the docs' under `docs`. */
export interface JaadResolvedConfig extends SiteResolvedConfig {
    docs: DocsResolvedConfig
}

const OPTIONS = Object.keys(jaadConfigSchema.shape)
const FORWARDED = ['site', 'base', 'astro']

/** Unknown keys are rejected here: zod would strip a misspelt option in
 *  silence. Both messages are read in a terminal, not parsed. */
export function parseConfig(options: JaadUserConfig): JaadConfig {
    const known = new Set([...OPTIONS, ...FORWARDED])
    const unknown = Object.keys(options).filter((key) => {
        return !known.has(key)
    })

    if (unknown.length > 0) {
        const named = unknown.map((key) => {
            const close = OPTIONS.find((o) => {
                return o.toLowerCase() === key.toLowerCase()
            })
            return close ? `${key} (did you mean ${close}?)` : key
        })
        throw new Error(
            `jaad: unknown option${unknown.length > 1 ? 's' : ''} ${named.join(', ')}\n` +
                `  available: ${OPTIONS.join(', ')}`,
        )
    }

    const parsed = jaadConfigSchema.safeParse(options)
    if (parsed.success) {
        return parsed.data
    }

    throw new Error(
        'jaad: invalid configuration\n' +
            parsed.error.issues
                .map((issue) => {
                    return `  ${issue.path.join('.') || 'config'}: ${issue.message}`
                })
                .join('\n'),
    )
}

/** The options that are the site's, shared with every package on it. */
export function siteOptionsOf(config: JaadConfig): SiteConfig {
    const {
        docsDir: _docsDir,
        routeBase: _routeBase,
        sections: _sections,
        editLink: _editLink,
        llms: _llms,
        locales: _locales,
        ...siteOptions
    } = config
    return siteOptions
}

/** CSS variables of the fonts set in `astro.fonts`. */
export function fontVariables(options: JaadUserConfig): string[] {
    return (options.astro?.fonts ?? []).map((font) => {
        return font.cssVariable
    })
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
