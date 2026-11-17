import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { isLocale } from '../site/locales.ts'

function hasMarkdown(dir: string): boolean {
    return readdirSync(dir, { withFileTypes: true }).some((entry) =>
        entry.isDirectory() ? hasMarkdown(join(dir, entry.name)) : entry.name.endsWith('.md'),
    )
}

/** Locale directories under docs/, or none. Two mean the tree is organised by
 *  language; one counts only when `lang` names it. */
export function detectLocales(docsDir: string, lang: string): string[] {
    if (!existsSync(docsDir)) return []

    // The directory as written, for the disk; the code in lower case, as collection ids spell it.
    const candidates = readdirSync(docsDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && isLocale(entry.name))
        .map((entry) => ({ directory: entry.name, code: entry.name.toLowerCase() }))
        .toSorted((a, b) => a.code.localeCompare(b.code))

    const localised = candidates.length >= 2 || (candidates.length === 1 && candidates[0].code === lang.toLowerCase())
    if (!localised) return []

    // An empty directory would reach the switcher and answer 404.
    return candidates
        .filter((candidate) => hasMarkdown(join(docsDir, candidate.directory)))
        .map((candidate) => candidate.code)
}

/** Once localised, every top-level entry is a locale and `lang` names one. */
export function validateLocaleTree(docsDir: string, locales: string[], lang: string): void {
    const issues: string[] = []

    const strays = readdirSync(docsDir, { withFileTypes: true })
        .filter((entry) => !(entry.isDirectory() && isLocale(entry.name)))
        .map((entry) => entry.name)
        .toSorted()

    for (const stray of strays) {
        issues.push(`docs/${stray} is not a locale, but ${locales.join(', ')} are`)
    }

    const codes = locales.map((locale) => locale.toLowerCase())
    if (!codes.includes(lang.toLowerCase())) {
        issues.push(`lang is "${lang}", which has no directory; found ${locales.join(', ')}`)
    }

    if (issues.length > 0) {
        throw new Error(
            `jaad: mixed documentation tree\n${issues.map((issue) => `  ${issue}`).join('\n')}\n` +
                'Move every page under a locale directory, or set locales: false.',
        )
    }
}
