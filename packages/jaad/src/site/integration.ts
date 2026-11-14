import type { SiteResolvedConfig } from './config.ts'
import type { SiteStylesheets } from './virtual.ts'
import type { AstroIntegration, AstroUserConfig } from 'astro'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { fonts } from './fonts.ts'
import { siteVirtualPlugin } from './virtual.ts'

type SetupParams = Parameters<NonNullable<AstroIntegration['hooks']['astro:config:setup']>>[0]
type VitePlugins = NonNullable<NonNullable<AstroUserConfig['vite']>['plugins']>

const NOT_INSTALLED = new Set(['MODULE_NOT_FOUND', 'ERR_PACKAGE_PATH_NOT_EXPORTED'])

/** The site's own `@tailwindcss/vite`, unless it already registered one. */
export function loadTailwindPlugin(root: string, registered: VitePlugins | undefined): VitePlugins {
    const plugins = ([registered] as unknown[]).flat(Infinity) as ({
        name?: string
    } | null)[]
    if (plugins.some((p) => p?.name?.startsWith('@tailwindcss/vite'))) return []

    const load = createRequire(join(root, 'package.json'))
    let tailwindcss: () => VitePlugins
    try {
        load.resolve('tailwindcss/package.json')
        ;({ default: tailwindcss } = load('@tailwindcss/vite') as {
            default: () => VitePlugins
        })
    } catch (error) {
        if (!NOT_INSTALLED.has((error as { code?: string }).code ?? '')) throw error
        throw new Error(
            'jaad: `tailwind: true` needs Tailwind in your project:\n  npm i -D tailwindcss @tailwindcss/vite',
            { cause: error },
        )
    }
    return tailwindcss()
}

/** The virtual modules, Tailwind when asked for, and the fonts. `config` is
 *  what `virtual:jaad/config` serves. */
export function setupSite(
    { config: astroConfig, updateConfig }: SetupParams,
    config: SiteResolvedConfig,
    stylesheets: SiteStylesheets,
): void {
    updateConfig({
        vite: {
            plugins: [
                siteVirtualPlugin(config, stylesheets),
                ...(config.tailwind
                    ? [loadTailwindPlugin(fileURLToPath(astroConfig.root), astroConfig.vite.plugins)]
                    : []),
            ],
            // Package .astro sources must reach the Astro compiler.
            ssr: { noExternal: ['@jaamd/jaad'] },
        },
        fonts,
    })
}
