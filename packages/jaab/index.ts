import type { AstroIntegration } from 'astro'
import { fileURLToPath } from 'node:url'
import { fontVariables } from '@jaamd/site/astro-config.ts'
import { siteOptionsOf } from '@jaamd/site/config.ts'
import { siteIntegration } from '@jaamd/site/integration.ts'
import { packageVersion } from '@jaamd/site/members.ts'
import { normaliseBasePath } from '@jaamd/site/urls.ts'
import { parseConfig, type JaabUserConfig } from './src/config.ts'
import { createJaabIntegration } from './src/integration.ts'

const own = (path: string) => {
    return fileURLToPath(new URL(path, import.meta.url))
}

/** The site, then the blog on it: Astro flattens nested arrays in
 *  `integrations`. The options are checked here, so a wrong one fails as the
 *  config loads; the rest is resolved once Astro knows the project's directories. */
export default function jaab(options: JaabUserConfig): AstroIntegration[] {
    const config = parseConfig(options)
    const site = siteIntegration({
        options: siteOptionsOf(config),
        fonts: fontVariables(options),
        member: {
            package: '@jaamd/jaab',
            version: packageVersion(new URL('./package.json', import.meta.url)),
            credit: { name: 'JAAB', href: 'https://docs.jaamd.org/jaab' },
            label: 'Blog',
            base: normaliseBasePath(config.routeBase),
            llms: config.llms ? own('./src/endpoints.ts') : null,
            // A layout of the project's own leaves the 404 to the project, or to Astro.
            notFound: config.layout ? null : own('./src/routes/404.astro'),
        },
    })
    return [site, createJaabIntegration(options, site)]
}

export { defineJaabConfig } from './src/config.ts'
export type { JaabUserConfig } from './src/config.ts'
export { defineSiteConfig } from '@jaamd/site/config.ts'
export type { SiteUserConfig } from '@jaamd/site/config.ts'
