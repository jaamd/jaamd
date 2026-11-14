import type { ShikiConfig } from 'astro'

/** A Shiki theme name, or one for each colour scheme. */
export type ShikiTheme = string | { light: string; dark: string }

/** Astro's default `shikiConfig.theme`, filled in before integrations run. */
const ASTRO_DEFAULT_THEME = 'github-dark'

/**
 * `markdown.shikiConfig` with `theme` applied. Without one, the config stays
 * as it is, except Astro's own default, which becomes "github-light".
 * `{ light, dark }` sets Shiki's `themes` with no default colour: `dual`.
 */
export function withTheme(current: ShikiConfig, theme?: ShikiTheme): { shikiConfig: ShikiConfig; dual: boolean } {
    const shikiConfig: ShikiConfig = { ...current }
    const configured = Object.keys(shikiConfig.themes ?? {}).length > 0 || shikiConfig.theme !== ASTRO_DEFAULT_THEME
    const resolved = theme ?? (configured ? undefined : 'github-light')

    if (typeof resolved === 'object') {
        if (!resolved.light || !resolved.dark) return { shikiConfig, dual: false }
        delete shikiConfig.theme
        shikiConfig.themes = { light: resolved.light, dark: resolved.dark } as ShikiConfig['themes']
        shikiConfig.defaultColor = false
        return { shikiConfig, dual: true }
    }

    if (resolved) shikiConfig.theme = resolved as ShikiConfig['theme']
    return { shikiConfig, dual: false }
}
