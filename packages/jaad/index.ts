import type { AstroIntegration } from 'astro'
import jaamd from '@jaamd/astro'
import { shikiTheme } from '@jaamd/site/config.ts'
import { parseConfig, type JaadUserConfig } from './src/config.ts'
import { createIntegrationState } from './src/docs/integration.ts'
import { createJaadIntegration } from './src/integration.ts'

/** The whole set: Astro flattens nested arrays in `integrations`. The options
 *  are checked here, so a wrong one fails as the config loads; the rest is
 *  resolved once Astro knows the project's directories. */
export default function jaad(options: JaadUserConfig): AstroIntegration[] {
    const config = parseConfig(options)
    return [jaamd({ theme: shikiTheme(config) }), createJaadIntegration(options, createIntegrationState())]
}

export { defineJaadConfig } from './src/config.ts'
export type { JaadUserConfig } from './src/config.ts'
