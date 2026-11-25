import { markdownPathFor, prefersMarkdown } from '@jaamd/jaad/negotiation'

interface Env {
    ASSETS: { fetch(request: Request | URL | string): Promise<Response> }
}

const MARKDOWN = 'text/markdown; charset=utf-8'

/** The opening pages, whose Markdown is at their named url. */
export const MARKDOWN_SOURCES: Record<string, string> = {
    '/': '/welcome.md',
    '/jaamd': '/jaamd/overview.md',
    '/jaad': '/jaad/overview.md',
}

/** Pages that moved, by their old path. */
export const MOVED: Record<string, string> = {
    '/jaad/getting-started/creating-pages': '/jaad/getting-started/pages',
    '/jaad/configurations/structure': '/jaad/getting-started/pages',
    '/jaad/getting-started/keyboard-shortcuts': '/jaad/configurations/search',
    '/jaad/configurations/fonts': '/jaad/configurations/styles',
    '/jaad/markdown': '/jaamd/markdown',
    '/jaad/upgrade/upgrading': '/jaad/upgrading',
    '/jaad/upgrade/migrating': '/jaad/upgrading',
}

/** The new path of a moved page or of its Markdown, or null. */
export function movedTo(path: string): string | null {
    const markdown = path.endsWith('.md')
    const target = MOVED[markdown ? path.slice(0, -'.md'.length) : path]
    if (!target) {
        return null
    }
    return markdown ? `${target}.md` : `${target}/`
}

/** Where the Markdown of a page is, or null for a file of another type. */
export function markdownSource(path: string): string | null {
    return markdownPathFor(path, MARKDOWN_SOURCES)
}

/** The response, varying on Accept besides whatever it already varies on. */
function withHeaders(response: Response, headers: Record<string, string> = {}): Response {
    const copy = new Response(response.body, response)
    for (const [name, value] of Object.entries(headers)) {
        copy.headers.set(name, value)
    }

    const vary = copy.headers.get('Vary')
    const varies = vary?.split(',').some((name) => {
        return ['accept', '*'].includes(name.trim().toLowerCase())
    })
    if (!varies) {
        copy.headers.append('Vary', 'Accept')
    }

    return copy
}

function markdownNotFound(url: URL): Response {
    // A path cannot hold a backtick: the URL parser percent-encodes it.
    const body = `# Not found\n\nNothing is published at \`${url.pathname}\`. The documentation index is ${url.origin}/llms.txt.\n`
    return new Response(body, { status: 404, headers: { 'Content-Type': MARKDOWN, Vary: 'Accept' } })
}

/** The same request, for another path on this site. `new URL(path, url)`
 *  would read a path starting with `//` as another host. */
function requestFor(request: Request, path: string): Request {
    const url = new URL(request.url)
    url.pathname = path
    url.search = ''
    return new Request(url, request)
}

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const url = new URL(request.url)
        const path = url.pathname.replace(/\/+$/, '') || '/'

        const moved = movedTo(path)
        if (moved) {
            return Response.redirect(new URL(`${moved}${url.search}`, url).href, 301)
        }

        if (prefersMarkdown(request)) {
            const source = markdownSource(path)
            if (source) {
                const markdown = await env.ASSETS.fetch(requestFor(request, source))
                if (markdown.ok) {
                    return withHeaders(markdown, { 'Content-Type': MARKDOWN })
                }
            }
            const response = await env.ASSETS.fetch(request)
            return response.status === 404 ? markdownNotFound(url) : withHeaders(response)
        }

        return withHeaders(await env.ASSETS.fetch(request))
    },
}
