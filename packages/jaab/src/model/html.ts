/** Rewrites of a post's rendered HTML, for the summary and the feed. Pure, so it is tested alone. */

/** A post's HTML without the title it may open with, which its page and the
 *  feed already show apart. */
export function withoutTitle(html: string): string {
    return html.replace(/^\s*<h1\b[^>]*>[\s\S]*?<\/h1>/i, '')
}

/** Root-relative links and images made absolute: a feed reader shows the post
 *  away from the site. */
export function absoluteUrls(html: string, origin: string): string {
    const absolute = (url: string): string => {
        return url.startsWith('/') && !url.startsWith('//') ? `${origin}${url}` : url
    }

    return html
        .replace(/\b(href|src)="([^"]*)"/g, (_, name: string, url: string) => {
            return `${name}="${absolute(url)}"`
        })
        .replace(/\bsrcset="([^"]*)"/g, (_, list: string) => {
            const candidates = list.split(',').map((candidate) => {
                const [url = '', ...descriptor] = candidate.trim().split(/\s+/)
                return [absolute(url), ...descriptor].join(' ')
            })
            return `srcset="${candidates.join(', ')}"`
        })
}
