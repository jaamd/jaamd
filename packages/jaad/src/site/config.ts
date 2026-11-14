import type { Locale } from './locales.ts'
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { z } from 'astro/zod'
import { inferDescription, type RepoInfo } from './infer.ts'
import { PRESETS, PRESET_NAMES, isPreset } from './themes.ts'

const publicUrl = (field: string, example: string) =>
    z.string().refine((v) => v.startsWith('/') || /^https?:\/\//.test(v), {
        message: `${field} must be a public url, such as "${example}"`,
    })

/** The options of the site around the pages: identity, header, footer, head and theme. */
export const siteConfigShape = {
    title: z.string(),
    description: z.string().optional(),
    lang: z.string().default('en'),
    logo: publicUrl('logo', '/logo.svg').optional(),
    /** Where the site name in the header leads: the site root, or another site. */
    homeLink: z.string().default('/'),

    social: z
        .record(
            z.string(),
            z.union([
                z.string(),
                z.object({
                    href: z.string(),
                    label: z.string().optional(),
                    svg: z.string().optional(),
                }),
            ]),
        )
        .default({}),
    nav: z.array(z.object({ label: z.string(), href: z.string() })).default([]),
    footer: z
        .union([z.string(), z.literal(false)], {
            error:
                'footer is one line of text, or false to remove it. ' +
                'The message/copyright pair is gone: write them as a single string, ' +
                'e.g. "MIT Licensed · © 2026 Me · :credit".',
        })
        .optional(),

    head: z
        .array(
            z.object({
                tag: z.string(),
                attrs: z.record(z.string(), z.union([z.string(), z.boolean()])).optional(),
                content: z.string().optional(),
            }),
        )
        .default([]),
    ogImage: z.union([publicUrl('ogImage', '/og-image.png'), z.literal(false)]).optional(),

    theme: z
        .union([
            z.string().refine(isPreset, {
                message: `unknown theme; available: ${PRESET_NAMES.join(', ')}`,
            }),
            z.object({ light: z.string(), dark: z.string() }),
        ])
        .default('default'),

    appearance: z
        .enum(['auto', 'light', 'dark'], {
            error: 'unknown appearance; available: auto, light, dark',
        })
        .default('auto'),

    /** Registers Tailwind (the site's own install) and exposes JAAD's tokens to it. */
    tailwind: z.boolean().default(false),

    /** Per-locale overrides for JAAD's bundled interface strings. */
    ui: z.record(z.string(), z.record(z.string(), z.string())).default({}),
}

const siteConfigSchema = z.object(siteConfigShape)

export type SiteConfig = z.output<typeof siteConfigSchema>

/** The site options plus what the project could tell. Inferred fields are null
 *  when unavailable. */
export interface SiteResolvedConfig extends SiteConfig {
    /** What jaamd gets for code blocks. */
    shiki: string | { light: string; dark: string }
    repoUrl: string | null
    favicon: string | null
    /** Explicit, inferred from public/, or false when no valid image exists. */
    ogImage: string | false
    /** Empty when the site is not localised. */
    locales: Locale[]
    /** `lang` when the site is not localised. */
    defaultLocale: string
}

const FAVICONS = ['favicon.svg', 'favicon.ico', 'favicon.png']
const OG_IMAGES = ['og-image.png', 'og-image.jpg', 'og-image.jpeg', 'og-image.webp']

function findPublicAsset(cwd: string, candidates: string[]): string | null {
    for (const name of candidates) {
        if (existsSync(join(cwd, 'public', name))) return `/${name}`
    }
    return null
}

/** The fields the site derives from its options and the project. */
export function resolveSiteConfig(
    config: SiteConfig,
    repo: RepoInfo | null,
    cwd: string,
): Pick<SiteResolvedConfig, 'description' | 'repoUrl' | 'favicon' | 'ogImage' | 'shiki'> {
    return {
        description: config.description ?? inferDescription(cwd) ?? undefined,
        repoUrl: repo?.url ?? null,
        favicon: findPublicAsset(cwd, FAVICONS),
        ogImage: config.ogImage ?? findPublicAsset(cwd, OG_IMAGES) ?? false,
        shiki: typeof config.theme === 'string' ? PRESETS[config.theme].shiki : config.theme,
    }
}

const requireFrom = createRequire(import.meta.url)

const styleInPackage = (name: string) => fileURLToPath(new URL(`./styles/${name}`, import.meta.url))

/** Absolute paths, kept off the resolved config, which gets serialised. */
export function resolveStylesheets(
    config: SiteConfig,
    cwd: string = process.cwd(),
): {
    user: string | null
    theme: string | null
    bridge: string
    tailwind: string | null
} {
    const userCss = join(cwd, 'src', 'jaad.css')
    const slug = typeof config.theme === 'string' ? PRESETS[config.theme].theme : null

    return {
        user: existsSync(userCss) ? userCss : null,
        // Resolved through JAAMD's export map rather than by path.
        theme: slug ? requireFrom.resolve(`@jaamd/astro/themes/${slug}.css`) : null,
        // A preset supplies the palette, so the colours travel the other way.
        bridge: styleInPackage(slug ? 'jaamd-reverse.css' : 'jaamd-forward.css'),
        tailwind: config.tailwind ? styleInPackage('tailwind.css') : null,
    }
}
