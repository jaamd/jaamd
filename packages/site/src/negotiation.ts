/** Serving a page's Markdown to a client that asks for it with `Accept`, from
 *  a host that runs code in front of the static files: a Worker, an edge
 *  function, a middleware. */

/** The quality of `type` in an Accept header, 0 when absent. */
export function quality(accept: string, type: string): number {
    for (const part of accept.split(',')) {
        const [media = '', ...params] = part.split(';').map((piece) => {
            return piece.trim()
        })
        if (media.toLowerCase() !== type) {
            continue
        }

        // Parameter names are case-insensitive, and may have spaces around `=`.
        const q = params.find((param) => {
            return /^q\s*=/i.test(param)
        })
        if (!q) {
            return 1
        }

        const value = Number(q.slice(q.indexOf('=') + 1).trim())
        return Number.isFinite(value) ? value : 0
    }
    return 0
}

/** Whether the client would rather read Markdown than HTML. */
export function prefersMarkdown(request: Request): boolean {
    const accept = request.headers.get('Accept') ?? ''
    return quality(accept, 'text/markdown') > quality(accept, 'text/html')
}

/**
 * The path of a page's Markdown, or null for a file of another type. Page
 * slugs never hold a dot, so a last segment with one is a file. `openers`
 * maps the paths of opening pages, served at their mount, to the Markdown of
 * their own slug: `{ '/': '/introduction.md' }`.
 */
export function markdownPathFor(pathname: string, openers: Record<string, string> = {}): string | null {
    const path = pathname.replace(/\/+$/, '') || '/'
    const opener = openers[path]
    if (opener !== undefined) {
        return opener
    }

    const last = path.slice(path.lastIndexOf('/'))
    return last.includes('.') ? null : `${path}.md`
}
