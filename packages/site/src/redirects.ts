import type { AstroIntegration } from 'astro'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { sep } from 'node:path'

type SetupParams = Parameters<NonNullable<AstroIntegration['hooks']['astro:config:setup']>>[0]
type ServerParams = Parameters<NonNullable<AstroIntegration['hooks']['astro:server:setup']>>[0]

/** Redirects a package derives from its markdown, such as a post's aliases. */
export interface RedirectSource {
    /** The directories of the markdown, absolute. */
    dirs: string[]
    /** The redirects as the files on disk give them now. */
    read: () => Record<string, string>
}

/** The redirects as text that changes only when they do, whatever their order. */
export function serialiseRedirects(redirects: Record<string, string>): string {
    const sorted = Object.entries(redirects).toSorted(([a], [b]) => {
        return a.localeCompare(b)
    })
    return `${JSON.stringify(Object.fromEntries(sorted), null, 2)}\n`
}

/** Writes `text` unless the file already holds it; true when it wrote. */
export function writeIfChanged(file: URL, text: string): boolean {
    if (existsSync(file) && readFileSync(file, 'utf8') === text) {
        return false
    }
    writeFileSync(file, text)
    return true
}

/** Whether a watcher event can change what `source` reads: a markdown file,
 *  or a directory, inside one of its directories. */
function touchesSource(event: string, path: string, source: RedirectSource): boolean {
    const inside = source.dirs.some((dir) => {
        return path.startsWith(dir + sep)
    })
    const relevant = path.endsWith('.md') || event === 'addDir' || event === 'unlinkDir'
    return inside && relevant
}

/**
 * Sets the redirects as Astro's own `redirects`, which a static build writes
 * as pages and an adapter as real 301s. Astro reads them once, as it reads its
 * config; in dev they are also written to a file Astro watches, as it watches
 * its config, and `astro:server:setup` rewrites that file when the markdown
 * changes them, so the server restarts with the new ones. Edits that leave the
 * redirects alone restart nothing. Returns what `astro:server:setup` calls.
 */
export function setupRedirects(params: SetupParams, source: RedirectSource): (server: ServerParams['server']) => void {
    const redirects = source.read()
    if (Object.keys(redirects).length > 0) {
        params.updateConfig({ redirects })
    }

    if (params.command !== 'dev') {
        return () => {}
    }

    // Written only when it differs: the restart it sets off reads the same
    // redirects, so it sets off no other.
    const file = new URL('redirects.json', params.createCodegenDir())
    writeIfChanged(file, serialiseRedirects(redirects))
    params.addWatchFile(file)

    return (server) => {
        server.watcher.on('all', (event, path) => {
            if (touchesSource(event, path, source)) {
                writeIfChanged(file, serialiseRedirects(source.read()))
            }
        })
    }
}
