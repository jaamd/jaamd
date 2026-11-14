interface Env {
    ASSETS: { fetch(request: Request | URL | string): Promise<Response> }
}

const DOCS = 'https://docs.jaamd.org'

/** Where an address of the old site lives now, or null when it is still here.
 *  `/docs` opened the JAAMD section and `/jaad` presented JAAD. */
export function movedTo(path: string): string | null {
    if (path === '/docs' || path === '/docs/') return `${DOCS}/jaamd`
    if (path.startsWith('/docs/')) return `${DOCS}${path.slice('/docs'.length)}`
    if (path === '/jaad' || path.startsWith('/jaad/')) return `${DOCS}/jaad`
    return null
}

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const url = new URL(request.url)
        const target = movedTo(url.pathname)
        if (target) return Response.redirect(target + url.search, 301)
        return env.ASSETS.fetch(request)
    },
}
