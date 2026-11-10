interface Env {
    ASSETS: { fetch(request: Request | URL | string): Promise<Response> }
}

const MARKDOWN = 'text/markdown; charset=utf-8'

const REDIRECTS: Record<string, string> = { '/docs': '/docs/jaamd' }

/** Pages whose Markdown is not at `<path>.md`. */
const MARKDOWN_SOURCES: Record<string, string> = {
    '/docs/jaamd': '/llms.txt',
    '/docs/jaad': '/docs/jaad/overview.md',
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

export function markdownSource(path: string): string | null {
    if (path in MARKDOWN_SOURCES) return MARKDOWN_SOURCES[path]
    if (path.startsWith('/docs/jaad/') && !path.slice(path.lastIndexOf('/')).includes('.')) return `${path}.md`
    return null
}

function withHeaders(response: Response, headers: Record<string, string>): Response {
    const copy = new Response(response.body, response)
    for (const [name, value] of Object.entries(headers)) copy.headers.set(name, value)
    return copy
}

function markdownNotFound(url: URL): Response {
    const body = `# Not found\n\nNothing is published at ${url.pathname}. The documentation index is ${url.origin}/docs/jaad/llms.txt, and the jaamd reference is ${url.origin}/llms.txt.\n`
    return new Response(body, { status: 404, headers: { 'Content-Type': MARKDOWN, Vary: 'Accept' } })
}

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const url = new URL(request.url)
        const path = url.pathname.replace(/\/+$/, '') || '/'

        if (path in REDIRECTS) return Response.redirect(new URL(REDIRECTS[path], url).href, 301)

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
