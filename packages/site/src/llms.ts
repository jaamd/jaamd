/** The text formats behind `llms.txt` and `llms-full.txt`, per the llms.txt
 *  convention. What the pages are, and in what order, is the caller's. */

/** An href made absolute when the site's url is known. */
export function absoluteHref(href: string, site: URL | undefined): string {
    return site ? new URL(href, site.origin).href : href
}

/** Text that cannot close the brackets of a Markdown link. */
export function linkText(text: string): string {
    return text.replace(/[\\[\]]/g, '\\$&')
}

/** One page of an `llms.txt` list. */
export function llmsLine(title: string, href: string, description?: string | null): string {
    const summary = description ? `: ${description}` : ''
    return `- [${linkText(title)}](${href})${summary}`
}

/** An `llms.txt`: the site's title and description, then its blocks. */
export function llmsDocument(title: string, description: string | null | undefined, blocks: string[]): string {
    const intro = description ? [`> ${description}`] : []
    return [`# ${title}`, ...intro, ...blocks].join('\n\n') + '\n'
}

export interface FullPage {
    /** The page as Markdown that reads on its own. */
    markdown: string
    /** Where that Markdown is served. */
    source: string
}

/** Every page in one file, each followed by where it comes from. */
export function llmsFullDocument(pages: FullPage[]): string {
    const parts = pages.map((page) => {
        return `${page.markdown.trimEnd()}\n\nSource: ${page.source}`
    })
    return parts.join('\n\n---\n\n') + '\n'
}

/** A plain-text response, as both files are served. */
export function textResponse(content: string): Response {
    return new Response(content, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
}
