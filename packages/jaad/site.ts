import type { JaadUserConfig } from './src/config.ts'
import type { AstroIntegration } from 'astro'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { defineConfig } from 'astro/config'
import jaad from './index.ts'

const CANDIDATES = ['jaad.config.ts', 'jaad.config.mjs', 'jaad.config.js']

const file = CANDIDATES.map((n) => join(process.cwd(), n)).find(existsSync)
if (!file) {
    throw new Error(`jaad: no config found. Create one of ${CANDIDATES.join(', ')} in the project root.`)
}

// Unanalysable on purpose: a static path would make Vite warn on every build.
const loaded = (await import(/* @vite-ignore */ pathToFileURL(file).href)) as {
    default: JaadUserConfig
}

/** The whole Astro config for a JAAD site. `astro` is merged in, with its
 *  integrations appended rather than replacing ours. */
function defineJaadSite(options: JaadUserConfig) {
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

export default defineJaadSite(loaded.default)
