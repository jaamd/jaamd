import { themes } from '@jaamd/astro/themes'

export interface Preset {
    /** Shiki theme, or a light/dark pair, for code blocks. */
    shiki: string | { light: string; dark: string }
    /** JAAMD theme slug, or null when JAAD's own identity already applies. */
    theme: string | null
    /** `dual` carries a light and a dark palette; the others apply in both modes. */
    mode: 'light' | 'dark' | 'dual'
}

/** JAAMD's palettes, plus `default`: JAAD's own, which needs no stylesheet. */
export const PRESETS: Record<string, Preset> = {
    default: {
        shiki: { light: 'github-light', dark: 'github-dark' },
        theme: null,
        mode: 'dual',
    },
    ...Object.fromEntries(
        themes.map((theme) => {
            return [theme.slug, { shiki: theme.shiki, theme: theme.slug, mode: theme.mode }]
        }),
    ),
}

export const PRESET_NAMES = Object.keys(PRESETS)

export const isPreset = (value: string): boolean => {
    return value in PRESETS
}

/** The preset `name`, which the config's schema has already checked. */
export function presetOf(name: string): Preset {
    const preset = PRESETS[name]
    if (preset === undefined) {
        throw new Error(`jaamd: unknown theme "${name}"; available: ${PRESET_NAMES.join(', ')}`)
    }
    return preset
}
