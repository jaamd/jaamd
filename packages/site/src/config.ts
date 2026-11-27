import type { Locale } from './locales.ts'
import type { SiteStylesheets } from './virtual.ts'
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { z } from 'astro/zod'
import { authorShape } from './authors.ts'
import { inferDescription, type RepoInfo } from './infer.ts'
import { isLocale } from './locales.ts'
import { toProjectPaths, type ProjectPaths } from './paths.ts'
import { linkHref, publicUrl } from './schema.ts'
import { PRESET_NAMES, isPreset, presetOf } from './themes.ts'
import { UI_KEYS } from './ui.ts'

/** A BCP 47 tag `Intl` accepts: "en_US" is not one, and would throw when a date is formatted. */
function isLanguageTag(tag: string): boolean {
    try {
        Intl.getCanonicalLocales(tag)
        return true
    } catch {
        return false
    }
}

/** The options of the site around the pages: identity, header, footer, head and theme. */
export const siteConfigShape = {
    title: z.string(),
    description: z.string().optional(),
    lang: z
        .string()
        .refine(isLanguageTag, { message: 'lang must be a language tag, such as "en" or "pt-BR"' })
        .default('en'),
    logo: publicUrl('logo', '/logo.svg').optional(),
    /** Where the site name in the header leads: the site root, or another site. */
    homeLink: linkHref('homeLink').default('/'),

    social: z
        .record(
            z.string(),
            z.union([
                linkHref('a social link'),
                z.strictObject({
                    href: linkHref('a social link'),
                    label: z.string().optional(),
                    svg: z.string().optional(),
                }),
            ]),
        )
        .default({}),
    nav: z.array(z.strictObject({ label: z.string(), href: linkHref('a nav link') })).default([]),
    /** The people who write the site, by the key a page names them with. */
    authors: z.record(z.string(), authorShape).default({}),
    footer: z
        .union([z.string(), z.literal(false)], {
            error:
                'footer is one line of text, or false to remove it. ' +
                'Write a message and a copyright as a single string, ' +
                'e.g. "MIT Licensed · © 2026 Me · :credit".',
        })
        .optional(),

    head: z
        .array(
            z.strictObject({
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
            z.strictObject({ light: z.string(), dark: z.string() }),
        ])
        .default('default'),

    appearance: z
        .enum(['auto', 'light', 'dark'], {
            error: 'unknown appearance; available: auto, light, dark',
        })
        .default('auto'),

    /** Registers Tailwind (the project's own install) and exposes the site's tokens to it. */
    tailwind: z.boolean().default(false),

    /** Per-locale overrides for the bundled interface strings. */
    ui: z
        .record(
            z.string().refine(isLocale, { message: 'not a locale code' }),
            z.partialRecord(z.enum(UI_KEYS), z.string()),
        )
        .default({}),
}

const siteConfigSchema = z.object(siteConfigShape)

export type SiteConfig = z.output<typeof siteConfigSchema>

/** The options of a package's config that are the site's, shared with every
 *  package on it: the keys of `siteConfigShape`, so a new one needs no other change. */
export function siteOptionsOf(config: SiteConfig): SiteConfig {
    const options: Record<string, unknown> = {}
    for (const key of Object.keys(siteConfigShape)) {
        if (key in config) {
            options[key] = config[key as keyof SiteConfig]
        }
    }
    return options as SiteConfig
}

/** The site options as written, before defaults. */
export type SiteUserConfig = z.input<typeof siteConfigSchema>

/** The site's options in one object, which each package's config spreads:
 *  the packages of one site must agree on them. */
export function defineSiteConfig(config: SiteUserConfig): SiteUserConfig {
    return config
}

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
    /** CSS variables of the fonts set in `astro.fonts`. */
    fonts: string[]
}

/** A feed a package writes, linked from every page of the site. */
export interface SiteFeed {
    title: string
    /** Below the deployment base, such as `/blog/rss.xml`. */
    path: string
}

/** A package the footer credits. */
export interface SiteCredit {
    name: string
    href: string
}

/** What `virtual:jaamd/site` serves: the config, and what the packages registered. */
export interface SiteModuleConfig extends SiteResolvedConfig {
    feeds: SiteFeed[]
    credits: SiteCredit[]
}

const FAVICONS = ['favicon.svg', 'favicon.ico', 'favicon.png']
const OG_IMAGES = ['og-image.png', 'og-image.jpg', 'og-image.jpeg', 'og-image.webp']

function findPublicAsset(publicDir: string, candidates: string[]): string | null {
    for (const name of candidates) {
        if (existsSync(join(publicDir, name))) {
            return `/${name}`
        }
    }
    return null
}

/** What jaamd gets for code blocks: a preset's Shiki theme, or the pair given. */
export function shikiTheme(config: Pick<SiteConfig, 'theme'>): SiteResolvedConfig['shiki'] {
    return typeof config.theme === 'string' ? presetOf(config.theme).shiki : config.theme
}

/** The fields the site derives from its options and the project. */
export function resolveSiteConfig(
    config: SiteConfig,
    repo: RepoInfo | null,
    paths: ProjectPaths,
): Pick<SiteResolvedConfig, 'description' | 'repoUrl' | 'favicon' | 'ogImage' | 'shiki'> {
    return {
        description: config.description ?? inferDescription(paths.root) ?? undefined,
        repoUrl: repo?.url ?? null,
        favicon: findPublicAsset(paths.publicDir, FAVICONS),
        ogImage: config.ogImage ?? findPublicAsset(paths.publicDir, OG_IMAGES) ?? false,
        shiki: shikiTheme(config),
    }
}

const requireFrom = createRequire(import.meta.url)

const styleInPackage = (name: string) => {
    return fileURLToPath(new URL(`./styles/${name}`, import.meta.url))
}

/** The project's own stylesheet: `jaamd.css` in its source directory, or
 *  `jaad.css`, the name JAAD 1.x reads, until 2.0. */
function projectStylesheet(paths: ProjectPaths): string | null {
    const current = join(paths.srcDir, 'jaamd.css')
    const legacy = join(paths.srcDir, 'jaad.css')
    const hasCurrent = existsSync(current)
    const hasLegacy = existsSync(legacy)

    if (hasCurrent && hasLegacy) {
        const currentName = relative(paths.root, current)
        const legacyName = relative(paths.root, legacy)
        throw new Error(
            `jaamd: ${currentName} and ${legacyName} both exist, and only one is read.\n` +
                `  Move the rules of ${legacyName} into ${currentName}, then delete ${legacyName}.`,
        )
    }
    if (hasCurrent) {
        return current
    }
    return hasLegacy ? legacy : null
}

/** Absolute paths, kept off the resolved config, which gets serialised. */
export function resolveStylesheets(
    config: SiteConfig,
    project: ProjectPaths | string = process.cwd(),
): SiteStylesheets {
    const slug = typeof config.theme === 'string' ? presetOf(config.theme).theme : null

    return {
        user: projectStylesheet(toProjectPaths(project)),
        // Resolved through JAAMD's export map rather than by path.
        theme: slug ? requireFrom.resolve(`@jaamd/astro/themes/${slug}.css`) : null,
        // A preset supplies the palette, so the colours travel the other way.
        bridge: styleInPackage(slug ? 'jaamd-reverse.css' : 'jaamd-forward.css'),
        tailwind: config.tailwind ? styleInPackage('tailwind.css') : null,
    }
}
