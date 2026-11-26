import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { isLocale } from './locales.ts'

function hasMarkdown(dir: string): boolean {
    return readdirSync(dir, { withFileTypes: true }).some((entry) => {
        return entry.isDirectory() ? hasMarkdown(join(dir, entry.name)) : entry.name.endsWith('.md')
    })
}

/** Locale directories under docs/, or none. Two mean the tree is organised by
 *  language; one counts only when `lang` names it. */
export function detectLocales(docsDir: string, lang: string): string[] {
    if (!existsSync(docsDir)) {
        return []
    }

    // The directory as written, for the disk; the code in lower case, as collection ids spell it.
    const candidates = readdirSync(docsDir, { withFileTypes: true })
        .filter((entry) => {
            return entry.isDirectory() && isLocale(entry.name)
        })
        .map((entry) => {
            return { directory: entry.name, code: entry.name.toLowerCase() }
        })
        .toSorted((a, b) => {
            return a.code.localeCompare(b.code)
        })

    const localised = candidates.length >= 2 || (candidates.length === 1 && candidates[0]?.code === lang.toLowerCase())
    if (!localised) {
        return []
    }

    // An empty directory would reach the switcher and answer 404.
    return candidates
        .filter((candidate) => {
            return hasMarkdown(join(docsDir, candidate.directory))
        })
        .map((candidate) => {
            return candidate.code
        })
}

/** Once localised, every top-level entry is a locale and `lang` names one. */
export function validateLocaleTree(docsDir: string, locales: string[], lang: string): void {
    const issues: string[] = []

    const strays = readdirSync(docsDir, { withFileTypes: true })
        .filter((entry) => {
            return !(entry.isDirectory() && isLocale(entry.name))
        })
        .map((entry) => {
            return entry.name
        })
        .toSorted()

    for (const stray of strays) {
        issues.push(`docs/${stray} is not a locale, but ${locales.join(', ')} are`)
    }

    const codes = locales.map((locale) => {
        return locale.toLowerCase()
    })
    if (!codes.includes(lang.toLowerCase())) {
        issues.push(`lang is "${lang}", which has no directory; found ${locales.join(', ')}`)
    }

    if (issues.length > 0) {
        const list = issues
            .map((issue) => {
                return `  ${issue}`
            })
            .join('\n')
        throw new Error(
            `jaad: mixed documentation tree\n${list}\n` +
                'Move every page under a locale directory, or set locales: false.',
        )
    }
}
