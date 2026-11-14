import { existsSync } from 'node:fs'
import { relative, resolve, sep } from 'node:path'
import { z } from 'astro/zod'
import { editBaseFrom, type RepoInfo } from '../site/infer.ts'
import { isLocale } from '../site/locales.ts'
import { normaliseBasePath } from '../site/urls.ts'
import { detectLocales, validateLocaleTree } from './locale-tree.ts'
import { slugToTitle } from './pages.ts'

/** The options of the documentation: where the markdown is and where it is served. */
export const docsConfigShape = {
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
    editLink: z.union([z.boolean(), z.string()]).default(true),
    /** Only when detection guesses wrong: pin the set, or false to switch it off. */
    locales: z
        .union([z.array(z.string().refine(isLocale, { message: 'not a locale code' })), z.literal(false)])
        .optional(),
}

const docsConfigSchema = z.object(docsConfigShape)

export type DocsConfig = z.output<typeof docsConfigSchema>

/** Where the docs are and where they are served. */
export interface DocsResolvedConfig {
    /** Where the docs are mounted, without a trailing slash. Empty at the root. */
    base: string
    /** `docsDir` as configured, relative to the project. */
    dir: string
    /** Whether `dir` holds pages: always without sections; with them, only
     *  when set, for the pages outside every section. */
    dirInUse: boolean
    /** Empty when the docs are not split into sections. */
    sections: DocsSection[]
    /** Edit url of the pages in `dir`, `:path` standing for the file. */
    editBase: string | null
}

export interface DocsSection {
    /** The url segment. */
    key: string
    label: string
    /** As configured, relative to the project. */
    dir: string
    editBase: string | null
}

/** A directory of markdown, and the section it is when the docs have sections. */
export interface DocsRoot {
    /** Absolute. */
    dir: string
    section?: string
}

/** Empty at the root, otherwise one leading slash and no trailing one. */
function resolveEditBase(editLink: DocsConfig['editLink'], repo: RepoInfo | null, docsDir: string): string | null {
    if (typeof editLink === 'string') return editLink
    if (!editLink || !repo) return null
    return editBaseFrom(repo, docsDir)
}

function resolveSections(config: DocsConfig, repo: RepoInfo | null): DocsSection[] {
    return Object.entries(config.sections ?? {}).map(([key, section]) => ({
        key,
        label: section.label ?? slugToTitle(key),
        dir: section.dir,
        editBase: resolveEditBase(config.editLink, repo, section.dir),
    }))
}

/** No directory may be, or be inside, another. */
function assertSeparateRoots(roots: DocsRoot[], cwd: string): void {
    const paths = roots.map((root) => root.dir + sep)
    const nested = roots.filter((_, at) => paths.some((other, from) => from !== at && paths[at].startsWith(other)))
    if (nested.length === 0) return

    throw new Error(
        'jaad: sections overlap\n' +
            nested
                .map((root) => `  ${root.section ?? 'docsDir'}: ${relative(cwd, root.dir)} is, or is inside, another`)
                .join('\n') +
            '\nGive every section, and docsDir, a directory of its own.',
    )
}

/**
 * The docs, and the locale codes their directories are written in.
 * `docsDirSet` tells whether the user set `docsDir`: alongside sections, only
 * then does it hold pages.
 */
export function resolveDocsConfig(
    config: DocsConfig,
    lang: string,
    docsDirSet: boolean,
    repo: RepoInfo | null,
    cwd: string,
): { docs: DocsResolvedConfig; locales: string[] } {
    const sections = resolveSections(config, repo)
    const docs: DocsResolvedConfig = {
        base: normaliseBasePath(config.routeBase),
        dir: config.docsDir,
        dirInUse: sections.length === 0 || docsDirSet,
        sections,
        editBase: resolveEditBase(config.editLink, repo, config.docsDir),
    }

    const roots = docsRoots(docs, cwd)
    assertSeparateRoots(roots, cwd)
    const locales = resolveLocales(config, lang, roots)

    const ambiguous = sections.find((section) => locales.includes(section.key))
    if (ambiguous) {
        throw new Error(`jaad: section "${ambiguous.key}" has the name of a language the docs are written in`)
    }

    return { docs, locales }
}

/** Where the markdown lives: `dir` when in use, then the directory of every section. */
export function docsRoots(docs: Pick<DocsResolvedConfig, 'dir' | 'dirInUse' | 'sections'>, cwd: string): DocsRoot[] {
    return [
        ...(docs.dirInUse ? [{ dir: resolve(cwd, docs.dir) }] : []),
        ...docs.sections.map((section) => ({ dir: resolve(cwd, section.dir), section: section.key })),
    ]
}

/** Directory names win; `locales` only overrides what detection found. */
function resolveLocales(config: DocsConfig, lang: string, roots: DocsRoot[]): string[] {
    if (config.locales === false) return []

    const perRoot = roots.map((root) => resolveLocalesIn(root.dir, config, lang))
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

function resolveLocalesIn(docsDir: string, config: DocsConfig, lang: string): string[] {
    const locales = Array.isArray(config.locales) ? config.locales : detectLocales(docsDir, lang)
    // A pinned list skips detection, and with it the missing-directory guard;
    // the integration warns about that case with better words than readdir does.
    if (locales.length === 0 || !existsSync(docsDir)) return []

    validateLocaleTree(docsDir, locales, lang)
    return locales.map((locale) => locale.toLowerCase()).toSorted()
}
