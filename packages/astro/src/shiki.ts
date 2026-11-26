import type { AstroConfig } from 'astro'

/** `markdown.shikiConfig` as Astro hands it to integrations, defaults filled in. */
type ShikiConfig = AstroConfig['markdown']['shikiConfig']

/** A Shiki theme name, or one for each colour scheme. */
export type ShikiTheme = string | { light: string; dark: string }

/** Astro's default `shikiConfig.theme`, filled in before integrations run. */
const ASTRO_DEFAULT_THEME = 'github-dark'

/**
 * `markdown.shikiConfig` with `theme` applied. Without one, the config stays
 * as it is, except Astro's own default, which becomes "github-light".
 * `{ light, dark }` sets Shiki's `themes` with no default colour: `dual`.
 */
export function withTheme(
    current: ShikiConfig,
    theme?: ShikiTheme | undefined,
): { shikiConfig: Partial<ShikiConfig>; dual: boolean } {
    const configured = Object.keys(current.themes ?? {}).length > 0 || current.theme !== ASTRO_DEFAULT_THEME
    const resolved = theme ?? (configured ? undefined : 'github-light')

    if (typeof resolved === 'object') {
        if (!resolved.light || !resolved.dark) {
            return { shikiConfig: { ...current }, dual: false }
        }
        // `themes` take over, so `theme` goes.
        const { theme: _theme, ...rest } = current
        const themes = { light: resolved.light, dark: resolved.dark } as ShikiConfig['themes']
        return { shikiConfig: { ...rest, themes, defaultColor: false }, dual: true }
    }

    const shikiConfig = { ...current }
    if (resolved) {
        shikiConfig.theme = resolved as ShikiConfig['theme']
    }
    return { shikiConfig, dual: false }
}
