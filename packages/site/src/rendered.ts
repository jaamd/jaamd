/** An h2 or h3 of a page, as the table of contents lists it. */
export interface PageHeading {
    depth: 2 | 3
    slug: string
    text: string
}

/** What Astro's renderer leaves on a markdown entry. */
export interface RenderedMarkdown {
    html: string
    metadata?: { headings?: { depth: number; slug: string; text: string }[] }
}

/** Elements whose text is not prose: code, controls, icons, and in-page navigation. */
const DROPPED = /<(pre|button|svg|nav|script|style|template)\b[^>]*>[\s\S]*?<\/\1>|<!--[\s\S]*?-->/gi

const BLOCK =
    /<\/?(address|article|aside|blockquote|br|dd|details|div|dl|dt|figcaption|figure|footer|h[1-6]|header|hr|li|ol|p|section|summary|table|tbody|td|tfoot|th|thead|tr|ul)\b[^>]*>/gi

const NAMED: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }

function decodeEntities(text: string): string {
    return text.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, name: string) => {
        if (name[0] !== '#') {
            return NAMED[name.toLowerCase()] ?? entity
        }
        const code = name[1] === 'x' || name[1] === 'X' ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10)
        return Number.isNaN(code) ? entity : String.fromCodePoint(code)
    })
}

/** Characters of code kept per stretch of a page: enough for the names a
 *  reader searches for, without letting long listings swell the index. */
const CODE_LIMIT = 2000

const PRE = /<pre\b[^>]*>([\s\S]*?)<\/pre>/gi

/** The text of the code blocks of an HTML fragment, cut at `CODE_LIMIT`. */
export function codeText(html: string): string {
    const blocks = [...html.matchAll(PRE)].map((match) => {
        // Line breaks are kept: they separate the tokens of a listing.
        return decodeEntities(match[1].replace(/<[^>]*>/g, ''))
    })
    return blocks
        .join('\n')
        .replace(/[ \t]+/g, ' ')
        .trim()
        .slice(0, CODE_LIMIT)
}

/** The readable text of an HTML fragment, on one line. */
export function htmlText(html: string): string {
    return decodeEntities(
        html
            .replace(DROPPED, ' ')
            .replace(BLOCK, ' ')
            .replace(/<[^>]*>/g, ''),
    )
        .replace(/\s+/g, ' ')
        .trim()
}

const VOID = new Set([
    'area',
    'base',
    'br',
    'col',
    'embed',
    'hr',
    'img',
    'input',
    'link',
    'meta',
    'source',
    'track',
    'wbr',
])

const TAG = /<(\/?)([a-zA-Z][\w-]*)([^>]*)>/g

interface HeadingTag {
    depth: number
    id: string
    /** Inside an element with `data-toc-ignore`, or carrying it. */
    ignored: boolean
    /** Where the opening tag starts, and where the closing one ends. */
    start: number
    end: number
}

/** Every heading of the page, and whether a `data-toc-ignore` element holds it.
 *  Read from the HTML: an element written as raw HTML wraps what follows it
 *  only there, not in the syntax tree. */
function headingTags(html: string): HeadingTag[] {
    const headings: HeadingTag[] = []
    let ignored: { tag: string; depth: number } | null = null
    let open: HeadingTag | null = null

    for (const match of html.matchAll(TAG)) {
        const [whole, closing, name, attrs] = match
        const tag = name.toLowerCase()
        const selfClosing = VOID.has(tag) || attrs.trimEnd().endsWith('/')

        if (ignored && tag === ignored.tag && !selfClosing) {
            ignored.depth += closing ? -1 : 1
            if (ignored.depth === 0) {
                ignored = null
            }
        } else if (!ignored && !closing && !selfClosing && /\sdata-toc-ignore\b/i.test(attrs)) {
            ignored = { tag, depth: 1 }
        }

        const heading = /^h([1-6])$/.exec(tag)
        if (!heading) {
            continue
        }
        if (!closing) {
            open = {
                depth: Number(heading[1]),
                id: /\sid="([^"]*)"/.exec(attrs)?.[1] ?? '',
                ignored: ignored !== null || /\sdata-toc-ignore\b/i.test(attrs),
                start: match.index,
                end: match.index + whole.length,
            }
        } else if (open) {
            open.end = match.index + whole.length
            headings.push(open)
            open = null
        }
    }

    return headings
}

/** The first h1, as the renderer read it. */
export function renderedTitle(rendered: RenderedMarkdown | undefined): string | null {
    return (
        rendered?.metadata?.headings?.find((heading) => {
            return heading.depth === 1
        })?.text ?? null
    )
}

const isOutline = (heading: HeadingTag) => {
    return !heading.ignored && (heading.depth === 2 || heading.depth === 3)
}

function headingOf(tag: HeadingTag, rendered: RenderedMarkdown): PageHeading {
    const known = rendered.metadata?.headings?.find((heading) => {
        return heading.slug === tag.id
    })
    return {
        depth: tag.depth as 2 | 3,
        slug: tag.id,
        text: known?.text ?? htmlText(rendered.html.slice(tag.start, tag.end)),
    }
}

/** The h2 and h3 of the page outside `data-toc-ignore`: its table of contents. */
export function pageHeadings(rendered: RenderedMarkdown | undefined): PageHeading[] {
    if (!rendered) {
        return []
    }
    return headingTags(rendered.html)
        .filter(isOutline)
        .map((tag) => {
            return headingOf(tag, rendered)
        })
}

/** A stretch of a page: the text under one h2 or h3, or before the first. */
export interface PageChunk {
    heading: PageHeading | null
    text: string
    /** The text of its code blocks, empty when it has none. */
    code: string
}

/** The page cut at the headings of its table of contents. The h1 is left out;
 *  any other heading stays in the text of the stretch it sits in. */
export function pageChunks(rendered: RenderedMarkdown | undefined): PageChunk[] {
    if (!rendered) {
        return [{ heading: null, text: '', code: '' }]
    }
    const { html } = rendered
    const tags = headingTags(html)
    const titles = tags.filter((tag) => {
        return tag.depth === 1
    })
    const cuts = tags.filter(isOutline)

    /** The text from `from` to `to`, without the h1. */
    const between = (from: number, to: number) => {
        let text = ''
        let at = from
        for (const title of titles) {
            if (title.end <= from || title.start >= to) {
                continue
            }
            text += html.slice(at, title.start) + ' '
            at = title.end
        }
        return htmlText(text + html.slice(at, to))
    }

    const stretch = (heading: PageHeading | null, from: number, to: number): PageChunk => {
        return { heading, text: between(from, to), code: codeText(html.slice(from, to)) }
    }

    return [
        stretch(null, 0, cuts[0]?.start ?? html.length),
        ...cuts.map((tag, at) => {
            return stretch(headingOf(tag, rendered), tag.end, cuts[at + 1]?.start ?? html.length)
        }),
    ]
}

/** The first paragraph that is not the title, cut to `maxLength` at a word,
 *  for `<meta name="description">`. */
export function pageDescription(
    rendered: RenderedMarkdown | undefined,
    title: string,
    maxLength: number = 155,
): string | null {
    if (!rendered) {
        return null
    }
    const prose = rendered.html.replace(DROPPED, ' ')
    const paragraphs = [...prose.matchAll(/<p\b([^>]*)>([\s\S]*?)<\/p>/gi)]
        .filter(([, attrs]) => {
            return !/markdown-alert-title/.test(attrs)
        })
        .map(([, , inner]) => {
            return htmlText(inner)
        })

    const first = paragraphs.find((text) => {
        return text && text.toLowerCase() !== title.trim().toLowerCase()
    })
    if (!first) {
        return null
    }

    if (first.length <= maxLength) {
        return first
    }
    const truncated = first.slice(0, maxLength)
    const lastSpace = truncated.lastIndexOf(' ')
    return `${truncated.slice(0, lastSpace > 0 ? lastSpace : maxLength)}…`
}
