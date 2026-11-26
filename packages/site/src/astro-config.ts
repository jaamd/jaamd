import type { AstroIntegration, AstroUserConfig, FontProvider, Locales, SessionDriverConfig } from 'astro'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { defineConfig } from 'astro/config'

/** Out of the packages' schemas, so `parse` strips it: the resolved config is
 *  serialised and an integration is not. */
export type AstroPassthroughConfig = AstroUserConfig<Locales, string | SessionDriverConfig | undefined, FontProvider[]>

/** The options a package's config passes on to Astro. */
export interface AstroOptions {
    site?: string
    base?: string
    astro?: AstroPassthroughConfig
}

/** The keys of `AstroOptions`, which a package's schema does not check. */
export const ASTRO_OPTIONS = ['site', 'base', 'astro']

/** CSS variables of the fonts set in `astro.fonts`. */
export function fontVariables(options: AstroOptions): string[] {
    return (options.astro?.fonts ?? []).map((font) => {
        return font.cssVariable
    })
}

/** The default export of `<product>.config.ts`, `.mjs` or `.js` at the root
 *  of the project being built. */
export async function loadConfigFile<Options>(product: string): Promise<Options> {
    const candidates = ['ts', 'mjs', 'js'].map((extension) => {
        return `${product}.config.${extension}`
    })
    const file = candidates
        .map((name) => {
            return join(process.cwd(), name)
        })
        .find(existsSync)
    if (!file) {
        throw new Error(`${product}: no config found. Create one of ${candidates.join(', ')} in the project root.`)
    }

    // Unanalysable on purpose: a static path would make Vite warn on every build.
    const loaded = (await import(/* @vite-ignore */ pathToFileURL(file).href)) as { default: Options }
    return loaded.default
}

/** The whole Astro config of a site: `options.astro` is merged in, with its
 *  integrations appended to the package's rather than replacing them. */
export function defineSite(options: AstroOptions, integrations: AstroIntegration[]) {
    const { site, base, astro } = options
    const extra = astro ?? {}
    const extraIntegrations = Array.isArray(extra.integrations) ? (extra.integrations as AstroIntegration[]) : []

    return defineConfig({
        ...(site ? { site } : {}),
        ...(base ? { base } : {}),
        ...extra,
        integrations: [...integrations, ...extraIntegrations],
    })
}
