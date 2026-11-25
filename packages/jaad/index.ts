import type { AstroIntegration } from 'astro'
import { fileURLToPath } from 'node:url'
import { siteIntegration } from '@jaamd/site/integration.ts'
import { packageVersion } from '@jaamd/site/members.ts'
import { normaliseBasePath } from '@jaamd/site/urls.ts'
import { fontVariables, parseConfig, siteOptionsOf, type JaadUserConfig } from './src/config.ts'
import { createIntegrationState } from './src/docs/integration.ts'
import { createJaadIntegration } from './src/integration.ts'

const own = (path: string) => {
    return fileURLToPath(new URL(path, import.meta.url))
}

/** The site, then the docs on it: Astro flattens nested arrays in
 *  `integrations`. The options are checked here, so a wrong one fails as the
 *  config loads; the rest is resolved once Astro knows the project's directories. */
export default function jaad(options: JaadUserConfig): AstroIntegration[] {
    const config = parseConfig(options)
    const site = siteIntegration({
        options: siteOptionsOf(config),
        fonts: fontVariables(options),
        member: {
            package: '@jaamd/jaad',
            version: packageVersion(new URL('./package.json', import.meta.url)),
            label: 'Docs',
            base: normaliseBasePath(config.routeBase),
            llms: config.llms ? own('./src/docs/endpoints.ts') : null,
            notFound: own('./src/docs/routes/404.astro'),
        },
    })
    return [site, createJaadIntegration(options, createIntegrationState(), site)]
}

export { defineJaadConfig } from './src/config.ts'
export type { JaadUserConfig } from './src/config.ts'
