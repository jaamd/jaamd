import type { AstroConfig } from 'astro'

/** `markdown.shikiConfig` as Astro hands it to integrations, defaults filled in. */
type ShikiConfig = AstroConfig['markdown']['shikiConfig']

/** A Shiki theme name, or one for each colour scheme. */
export type ShikiTheme = string | { light: string; dark: string }

/** Astro's default `shikiConfig.theme`, filled in before integrations run. */
const ASTRO_DEFAULT_THEME = 'github-dark'

export interface ThemeUpdate {
    /** Only the keys that change: `updateConfig` concatenates arrays, so
     *  `langs` or `transformers` passed back would run twice. */
    shikiConfig: Partial<ShikiConfig>
    /** `{ light, dark }` applied: the dual-theme stylesheet is needed. */
    dual: boolean
    /** Why the option was not applied, for a warning; null when it was, or was unset. */
    ignored: string | null
}

/**
 * What `theme` changes in `markdown.shikiConfig`. Unset, nothing changes,
 * except Astro's own default, which becomes "github-light". `{ light, dark }`
 * sets Shiki's `themes` with no default colour.
 */
export function withTheme(current: ShikiConfig, theme?: ShikiTheme | undefined): ThemeUpdate {
    const hasThemes = Object.keys(current.themes ?? {}).length > 0

    if (theme === undefined) {
        const configured = hasThemes || current.theme !== ASTRO_DEFAULT_THEME
        const shikiConfig = configured ? {} : { theme: 'github-light' as ShikiConfig['theme'] }
        return { shikiConfig, dual: false, ignored: null }
    }

    if (typeof theme === 'object') {
        if (!theme.light || !theme.dark) {
            return { shikiConfig: {}, dual: false, ignored: 'theme needs both a light and a dark theme' }
        }
        // Shiki reads `themes` over `theme`, so the configured `theme` can stay.
        const themes = { light: theme.light, dark: theme.dark } as ShikiConfig['themes']
        return { shikiConfig: { themes, defaultColor: false }, dual: true, ignored: null }
    }

    // A merge cannot take `themes` away, and Shiki would read it over `theme`.
    if (hasThemes) {
        return {
            shikiConfig: {},
            dual: false,
            ignored: `theme "${theme}" was not applied: markdown.shikiConfig.themes is set, and Shiki reads it instead`,
        }
    }

    return { shikiConfig: { theme: theme as ShikiConfig['theme'] }, dual: false, ignored: null }
}
