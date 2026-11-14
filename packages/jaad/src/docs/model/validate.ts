import type { DocsSource } from './tree.ts'
import { getCleanSlug, namedSlug } from './ids.ts'

/** Within a section, like `id`; across them, the section is part of the name. */
const inSection = (page: DocsSource, id: string) => (page.section ? `${page.section}/${id}` : id)

/** Fail before route generation when the file tree cannot produce one clear
 * navigation and URL for every page. */
export function validateDocsStructure(pages: DocsSource[], locale?: string): void {
    const idsBySlug = new Map<string, string[]>()
    const directoriesByChapter = new Map<string, Set<string>>()
    const issues: string[] = []
    // Messages name the file on disk, locale directory included.
    const named = (id: string) => (locale ? `${locale}/${id}` : id)

    const byId = pages.map((page) => ({ page, id: inSection(page, page.path) }))
    for (const { page, id } of byId.toSorted((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))) {
        const parts = page.path.split('/')
        if (parts.length > 2) {
            issues.push(`${named(id)}: only one chapter directory is supported inside docs/`)
        }

        const slug = namedSlug(page.path, page.section)
        const ids = idsBySlug.get(slug) ?? []
        ids.push(id)
        idsBySlug.set(slug, ids)

        if (parts.length === 2) {
            const directory = inSection(page, parts[0])
            const chapter = inSection(page, getCleanSlug(parts[0]))
            const directories = directoriesByChapter.get(chapter) ?? new Set()
            directories.add(directory)
            directoriesByChapter.set(chapter, directories)
        }
    }

    for (const [slug, ids] of idsBySlug) {
        if (ids.length > 1) {
            issues.push(`${ids.map(named).join(', ')} all resolve to /${slug}`)
        }
    }

    // A page outside the sections cannot take a section's url.
    const keys = new Set(pages.flatMap((page) => page.section ?? []))
    for (const page of pages) {
        const first = namedSlug(page.path, page.section).split('/')[0]
        if (!page.section && keys.has(first)) {
            issues.push(`${named(page.path)} resolves into section /${first}`)
        }
    }

    const byKey = new Map<string, string[]>()
    for (const page of pages) {
        const key = page.data.translationKey
        if (!key) continue
        const ids = byKey.get(key) ?? []
        ids.push(inSection(page, page.path))
        byKey.set(key, ids)
    }
    for (const [key, ids] of byKey) {
        if (ids.length > 1) {
            issues.push(`${ids.map(named).join(', ')} all claim translationKey ${key}`)
        }
    }

    for (const [chapter, directories] of directoriesByChapter) {
        if (directories.size > 1) {
            issues.push(`${[...directories].map(named).join(', ')} all resolve to chapter /${chapter}`)
        }
    }

    if (issues.length > 0) {
        throw new Error(`jaad: invalid documentation structure\n${issues.map((issue) => `  ${issue}`).join('\n')}`)
    }
}
