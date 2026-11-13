import type { AstroUserConfig, FontProvider, Locales, SessionDriverConfig } from 'astro'
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { z } from 'astro/zod'
import { inferRepo, inferDescription, editBaseFrom, type RepoInfo } from './infer.ts'
import { detectLocales, validateLocaleTree } from './locale-tree.ts'
import { describeLocale, isLocale, type Locale } from './locales.ts'
import { PRESETS, PRESET_NAMES, isPreset } from './themes/index.ts'
import { normaliseBasePath } from './urls.ts'
import { slugToTitle } from './utils/docs.ts'

export const jaadConfigSchema = z.object({
    title: z.string(),
    description: z.string().optional(),
    lang: z.string().default('en'),
    logo: z
        .string()
        .refine((v) => v.startsWith('/') || /^https?:\/\//.test(v), {
            message: 'logo must be a public url, such as "/logo.svg"',
        })
        .optional(),

    docsDir: z.string().default('./docs'),
    routeBase: z.string().default('/'),
    /** One directory per section, keyed by its url segment. Replaces `docsDir`. */
    sections: z
        .record(z.string(), z.object({ dir: z.string(), label: z.string().optional() }))
        .superRefine((sections, context) => {
            for (const key of Object.keys(sections)) {
                if (/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key)) continue
                context.addIssue({
                    code: 'custom',
                    path: [key],
                    message: 'a section key is its url segment: lowercase letters, digits and dashes',
                })
            }
        })
        .optional(),

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

    editLink: z.union([z.boolean(), z.string()]).default(true),

    head: z
        .array(
            z.object({
                tag: z.string(),
                attrs: z.record(z.string(), z.union([z.string(), z.boolean()])).optional(),
                content: z.string().optional(),
            }),
        )
        .default([]),
    ogImage: z
        .union([
            z.string().refine((v) => v.startsWith('/') || /^https?:\/\//.test(v), {
                message: 'ogImage must be a public url, such as "/og-image.png"',
            }),
            z.literal(false),
        ])
        .optional(),

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

    /** Only when detection guesses wrong: pin the set, or false to switch it off. */
    locales: z
        .union([z.array(z.string().refine(isLocale, { message: 'not a locale code' })), z.literal(false)])
        .optional(),
})

export type JaadConfig = z.output<typeof jaadConfigSchema>

/** Out of the schema, so `parse` strips them: the resolved config is
 *  serialised and an integration is not. */
type AstroPassthroughConfig = AstroUserConfig<Locales, string | SessionDriverConfig | undefined, FontProvider[]>

export type JaadUserConfig = z.input<typeof jaadConfigSchema> & {
    site?: string
    base?: string
    astro?: AstroPassthroughConfig
}

/** What the components actually read: the user's options plus whatever the
 *  repository could tell us. Inferred fields are null when unavailable. */
export interface JaadResolvedConfig extends JaadConfig {
    /** Where the docs are mounted, without a trailing slash. Empty at the root. */
    docsBase: string
    /** What jaamd gets for code blocks. */
    shiki: string | { light: string; dark: string }
    repoUrl: string | null
    editBase: string | null
    favicon: string | null
    /** Explicit, inferred from public/, or false when no valid image exists. */
    ogImage: string | false
    /** Empty when the docs are not split into sections. */
    docsSections: DocsSection[]
    /** Empty when the docs are not localised. */
    docsLocales: Locale[]
    /** `lang` when the docs are not localised. */
    defaultLocale: string
}

export interface DocsSection {
    /** The url segment. */
    key: string
    label: string
    /** As configured, relative to the project. */
    dir: string
    editBase: string | null
}

const FAVICONS = ['favicon.svg', 'favicon.ico', 'favicon.png']
const OG_IMAGES = ['og-image.png', 'og-image.jpg', 'og-image.jpeg', 'og-image.webp']

function findPublicAsset(cwd: string, candidates: string[]): string | null {
    for (const name of candidates) {
        if (existsSync(join(cwd, 'public', name))) return `/${name}`
    }
    return null
}

/** Empty at the root, otherwise one leading slash and no trailing one. */
function resolveEditBase(editLink: JaadConfig['editLink'], repo: RepoInfo | null, docsDir: string): string | null {
    if (typeof editLink === 'string') return editLink
    if (!editLink || !repo) return null
    return editBaseFrom(repo, docsDir)
}

const OPTIONS = Object.keys(jaadConfigSchema.shape)
const FORWARDED = ['site', 'base', 'astro']

/** Unknown keys are rejected here: zod would strip a misspelt option in
 *  silence. Both messages are read in a terminal, not parsed. */
function parseConfig(options: JaadUserConfig): JaadConfig {
    const known = new Set([...OPTIONS, ...FORWARDED])
    const unknown = Object.keys(options).filter((key) => !known.has(key))

    if (unknown.length > 0) {
        const named = unknown.map((key) => {
            const close = OPTIONS.find((o) => o.toLowerCase() === key.toLowerCase())
            return close ? `${key} (did you mean ${close}?)` : key
        })
        throw new Error(
            `jaad: unknown option${unknown.length > 1 ? 's' : ''} ${named.join(', ')}\n` +
                `  available: ${OPTIONS.join(', ')}`,
        )
    }

    const parsed = jaadConfigSchema.safeParse(options)
    if (parsed.success) return parsed.data

    throw new Error(
        'jaad: invalid configuration\n' +
            parsed.error.issues.map((issue) => `  ${issue.path.join('.') || 'config'}: ${issue.message}`).join('\n'),
    )
}

function resolveSections(config: JaadConfig, repo: RepoInfo | null, cwd: string): DocsSection[] {
    const sections = Object.entries(config.sections ?? {}).map(([key, section]) => ({
        key,
        label: section.label ?? slugToTitle(key),
        dir: section.dir,
        editBase: resolveEditBase(config.editLink, repo, section.dir),
    }))

    // No directory may be, or be inside, another.
    const paths = sections.map((section) => resolve(cwd, section.dir) + sep)
    const nested = sections.filter((_, at) => paths.some((other, from) => from !== at && paths[at].startsWith(other)))
    if (nested.length > 0) {
        throw new Error(
            'jaad: sections overlap\n' +
                nested
                    .map((section) => `  ${section.key}: ${section.dir} is, or is inside, another section`)
                    .join('\n') +
                '\nGive every section a directory of its own.',
        )
    }
    return sections
}

export function resolveConfig(options: JaadUserConfig, cwd: string = process.cwd()): JaadResolvedConfig {
    const config = parseConfig(options)
    const repo = inferRepo(cwd)
    const sections = resolveSections(config, repo, cwd)
    const locales = resolveLocales(config, cwd)

    const ambiguous = sections.find((section) => locales.includes(section.key))
    if (ambiguous) {
        throw new Error(`jaad: section "${ambiguous.key}" has the name of a language the docs are written in`)
    }

    return {
        ...config,
        docsSections: sections,
        description: config.description ?? inferDescription(cwd) ?? undefined,
        repoUrl: repo?.url ?? null,
        favicon: findPublicAsset(cwd, FAVICONS),
        ogImage: config.ogImage ?? findPublicAsset(cwd, OG_IMAGES) ?? false,
        docsBase: normaliseBasePath(config.routeBase),
        shiki: typeof config.theme === 'string' ? PRESETS[config.theme].shiki : config.theme,
        editBase: resolveEditBase(config.editLink, repo, config.docsDir),
        docsLocales: locales.map(describeLocale),
        defaultLocale: locales.length > 0 ? config.lang.toLowerCase() : config.lang,
    }
}

/** Where the markdown lives: `docsDir`, or the directory of every section. */
function docsRoots(config: Pick<JaadConfig, 'docsDir' | 'sections'>): string[] {
    const sections = Object.values(config.sections ?? {})
    return sections.length > 0 ? sections.map((section) => section.dir) : [config.docsDir]
}

/** Directory names win; `locales` only overrides what detection found. */
function resolveLocales(config: JaadConfig, cwd: string): string[] {
    if (config.locales === false) return []

    const perRoot = docsRoots(config).map((root) => resolveLocalesIn(join(cwd, root), config))
    const [first, ...rest] = perRoot
    const differing = rest.find((locales) => locales.join() !== first.join())
    if (differing) {
        throw new Error(
            'jaad: sections disagree on their languages\n' +
                `  found ${first.join(', ') || 'none'} and ${differing.join(', ') || 'none'}\n` +
                'Give every section the same locale directories, or none.',
        )
    }
    return first
}

function resolveLocalesIn(docsDir: string, config: JaadConfig): string[] {
    const locales = Array.isArray(config.locales) ? config.locales : detectLocales(docsDir, config.lang)
    // A pinned list skips detection, and with it the missing-directory guard;
    // the integration warns about that case with better words than readdir does.
    if (locales.length === 0 || !existsSync(docsDir)) return []

    validateLocaleTree(docsDir, locales, config.lang)
    return locales.map((locale) => locale.toLowerCase()).toSorted()
}

const requireFrom = createRequire(import.meta.url)

const styleInPackage = (name: string) => fileURLToPath(new URL(`./styles/${name}`, import.meta.url))

/** Absolute paths, kept off the resolved config, which gets serialised. */
export function resolveStylesheets(
    config: JaadConfig,
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

/** Identity helper, for a typed `jaad.config.ts`. */
export function defineJaadConfig(config: JaadUserConfig): JaadUserConfig {
    return config
}
