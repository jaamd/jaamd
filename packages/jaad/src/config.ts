import type { AstroUserConfig, FontProvider, Locales, SessionDriverConfig } from 'astro'
import { z } from 'astro/zod'
import { docsConfigShape, resolveDocsConfig, type DocsResolvedConfig } from './docs/config.ts'
import { resolveSiteConfig, siteConfigShape, type SiteResolvedConfig } from './site/config.ts'
import { inferRepo } from './site/infer.ts'
import { describeLocale } from './site/locales.ts'

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
function parseConfig(options: JaadUserConfig): JaadConfig {
    const known = new Set([...OPTIONS, ...FORWARDED])
    const unknown = Object.keys(options).filter((key) => !known.has(key))

    if (unknown.length > 0) {
        const named = unknown.map((key) => {
            const close = OPTIONS.find((o) => o.toLowerCase() === key.toLowerCase())
            return close ? `${key} (did you mean ${close}?)` : key
        })
        throw new Error(
            `jaad: unknown option${unknown.length > 1 ? 's' : ''} ${named.join(', ')}\n` +
                `  available: ${OPTIONS.join(', ')}`,
        )
    }

    const parsed = jaadConfigSchema.safeParse(options)
    if (parsed.success) return parsed.data

    throw new Error(
        'jaad: invalid configuration\n' +
            parsed.error.issues.map((issue) => `  ${issue.path.join('.') || 'config'}: ${issue.message}`).join('\n'),
    )
}

export function resolveConfig(options: JaadUserConfig, cwd: string = process.cwd()): JaadResolvedConfig {
    const config = parseConfig(options)
    const repo = inferRepo(cwd)
    const { docs, locales } = resolveDocsConfig(config, config.lang, options.docsDir !== undefined, repo, cwd)
    const {
        docsDir: _docsDir,
        routeBase: _routeBase,
        sections: _sections,
        editLink: _editLink,
        locales: _locales,
        ...siteOptions
    } = config

    return {
        ...siteOptions,
        ...resolveSiteConfig(siteOptions, repo, cwd),
        locales: locales.map(describeLocale),
        defaultLocale: locales.length > 0 ? config.lang.toLowerCase() : config.lang,
        docs,
    }
}

/** Identity helper, for a typed `jaad.config.ts`. */
export function defineJaadConfig(config: JaadUserConfig): JaadUserConfig {
    return config
}

export type { DocsResolvedConfig, DocsRoot, DocsSection } from './docs/config.ts'
export type { SiteResolvedConfig } from './site/config.ts'
