interface Env {
    ASSETS: { fetch(request: Request | URL | string): Promise<Response> }
}

const MARKDOWN = 'text/markdown; charset=utf-8'

/** The opening pages, whose Markdown is at their named url. */
const MARKDOWN_SOURCES: Record<string, string> = {
    '/': '/welcome.md',
    '/jaamd': '/jaamd/overview.md',
    '/jaad': '/jaad/overview.md',
}

/** Quality of `type` in an Accept header, 0 when absent. */
export function quality(accept: string, type: string): number {
    for (const part of accept.split(',')) {
        const [media, ...params] = part.split(';').map((s) => s.trim())
        if (media.toLowerCase() !== type) continue
        const q = params.find((p) => p.startsWith('q='))
        return q ? Number(q.slice(2)) : 1
    }
    return 0
}

export function prefersMarkdown(request: Request): boolean {
    const accept = request.headers.get('Accept') ?? ''
    return quality(accept, 'text/markdown') > quality(accept, 'text/html')
}

/** Where the Markdown of a page is, or null for a file of another type. */
export function markdownSource(path: string): string | null {
    if (path in MARKDOWN_SOURCES) return MARKDOWN_SOURCES[path]
    return path.slice(path.lastIndexOf('/')).includes('.') ? null : `${path}.md`
}

function withHeaders(response: Response, headers: Record<string, string>): Response {
    const copy = new Response(response.body, response)
    for (const [name, value] of Object.entries(headers)) copy.headers.set(name, value)
    return copy
}

function markdownNotFound(url: URL): Response {
    const body = `# Not found\n\nNothing is published at ${url.pathname}. The documentation index is ${url.origin}/llms.txt.\n`
    return new Response(body, { status: 404, headers: { 'Content-Type': MARKDOWN, Vary: 'Accept' } })
}

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const url = new URL(request.url)
        const path = url.pathname.replace(/\/+$/, '') || '/'

        if (prefersMarkdown(request)) {
            const source = markdownSource(path)
            if (source) {
                const markdown = await env.ASSETS.fetch(new URL(source, url))
                if (markdown.ok) return withHeaders(markdown, { 'Content-Type': MARKDOWN, Vary: 'Accept' })
            }
            const response = await env.ASSETS.fetch(request)
            return response.status === 404 ? markdownNotFound(url) : withHeaders(response, { Vary: 'Accept' })
        }

        return withHeaders(await env.ASSETS.fetch(request), { Vary: 'Accept' })
    },
}
