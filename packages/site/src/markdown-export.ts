/** A page as Markdown that reads on its own: for the `.md` routes, `llms-full.txt`
 *  and "Copy page". Links lead to other pages' Markdown, and JAAMD's directives
 *  become the plain Markdown they stand for. */

import type { Heading, Nodes, Parent, Root, RootContent, Text } from 'mdast'
import { posix } from 'node:path'
import remarkDirective from 'remark-directive'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import remarkStringify from 'remark-stringify'
import { unified } from 'unified'
import { SKIP, visit } from 'unist-util-visit'
import { decodeEntities } from './rendered.ts'

export interface ExportablePage {
    title: string
    /** The frontmatter description: one drawn from the body would repeat it. */
    description?: string | null | undefined
    /** The Markdown source, without frontmatter. */
    body: string
    /** The source file, relative to the project root. */
    filePath?: string | undefined
    /** The built URL of each local image, by the path the Markdown writes. */
    images?: Map<string, string> | undefined
}

export interface MarkdownExportContext {
    /** The Markdown URL of each page, by its source file relative to the project root. */
    markdownUrls: Map<string, string>
    /** The site's origin, as `https://example.dev`, for root-relative URLs; null leaves them as they are. */
    origin: string | null
}

const IMG = /<img\b[^>]*>/gi

/** An attribute of an `<img>` tag, decoded; null when the tag lacks it. */
function imgAttribute(tag: string, name: string): string | null {
    const value = new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1]
    return value === undefined ? null : decodeEntities(value)
}

/** The path of the local image an `<img>` of the collection's HTML stands
 *  for: Astro leaves a placeholder, filled in when the entry is rendered. */
function placeholderSource(tag: string): string | null {
    const placeholder = imgAttribute(tag, '__ASTRO_IMAGE_')
    if (placeholder === null) {
        return null
    }
    try {
        const { src } = JSON.parse(placeholder) as { src?: unknown }
        return typeof src === 'string' ? src : null
    } catch {
        return null
    }
}

/** The built URL of each local image, by the path the Markdown writes: the
 *  collection's HTML and the rendered HTML hold the same `<img>` tags in the
 *  same order, with the placeholders filled in. Empty when they do not. */
export function builtImageUrls(collectionHtml: string, renderedHtml: string): Map<string, string> {
    const placeholders = collectionHtml.match(IMG) ?? []
    const images = renderedHtml.match(IMG) ?? []
    const urls = new Map<string, string>()
    if (placeholders.length !== images.length) {
        return urls
    }

    for (const [at, tag] of placeholders.entries()) {
        const source = placeholderSource(tag)
        const built = imgAttribute(images[at] ?? '', 'src')
        if (source !== null && built !== null) {
            urls.set(source, built)
        }
    }
    return urls
}

/** The same key for `docs/a.md` and `./docs/a.md`, on any OS. */
export function sourceKey(filePath: string): string {
    return posix.normalize(filePath.replaceAll('\\', '/')).replace(/^\.\//, '')
}

/** A code tab's label: the meta written before any annotation, then the
 *  language, as JAAMD labels its tabs. */
function codeTabLabel(meta: string | null | undefined, lang: string | null | undefined, index: number): string {
    const label = meta ? meta.slice(0, meta.search(/(?:^|\s)(?=\{|\/|[\w-]+=)|$/)).trim() : ''
    return label || lang || `Tab ${index + 1}`
}

/** Where a link of the page leads once it is read away from the docs folder. */
function rewriteUrl(url: string, page: ExportablePage, context: MarkdownExportContext): string {
    if (/^[a-z][a-z\d+.-]*:/i.test(url) || url.startsWith('#') || url.startsWith('//')) {
        return url
    }
    if (url.startsWith('/')) {
        return context.origin ? `${context.origin}${url}` : url
    }

    const [path = '', hash] = url.split('#', 2)
    if (!path.endsWith('.md') || !page.filePath) {
        return url
    }

    let decoded: string
    try {
        decoded = decodeURI(path)
    } catch {
        return url
    }

    const target = context.markdownUrls.get(sourceKey(posix.join(posix.dirname(sourceKey(page.filePath)), decoded)))
    if (!target) {
        return url
    }
    return hash ? `${target}#${hash}` : target
}

/** The nodes a directive becomes, or null to keep it as it is. */
function flattenDirective(node: Nodes, body: string): RootContent[] | null {
    if (node.type !== 'containerDirective' && node.type !== 'leafDirective' && node.type !== 'textDirective') {
        return null
    }

    if (node.name === 'toc') {
        return []
    }

    if (node.name === 'code-tabs' && node.type === 'containerDirective') {
        let tab = 0
        return node.children.flatMap((child): RootContent[] => {
            if (child.type !== 'code') {
                return [child]
            }

            const label = codeTabLabel(child.meta, child.lang, tab++)
            const heading: RootContent = {
                type: 'paragraph',
                children: [{ type: 'strong', children: [{ type: 'text', value: label }] }],
            }
            return [heading, { ...child, meta: null }]
        })
    }

    if (node.name === 'spoiler') {
        return node.children as RootContent[]
    }

    // Like JAAMD's fallback: a block keeps its content, an inline or leaf
    // directive its source, as in a time such as `10:30`.
    if (node.type === 'containerDirective') {
        return node.children as RootContent[]
    }

    const start = node.position?.start.offset
    const end = node.position?.end.offset
    if (start === undefined || end === undefined) {
        return null
    }
    const text: Text = { type: 'text', value: body.slice(start, end) }
    return [text]
}

function hasTitle(tree: Root): boolean {
    return tree.children.some((node) => {
        return node.type === 'heading' && node.depth === 1
    })
}

const parse = unified().use(remarkParse).use(remarkGfm).use(remarkDirective)

const stringify = unified().use(remarkGfm).use(remarkStringify, {
    bullet: '-',
    fences: true,
    listItemIndent: 'one',
    rule: '-',
})

/** GFM alert markers written back the way the source had them. */
const ALERT_ESCAPE = /^(>\s*)\\\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/gim

export function exportMarkdown(page: ExportablePage, context: MarkdownExportContext): string {
    const tree = parse.parse(page.body) as Root

    visit(tree, (node, index, parent) => {
        if (index === undefined || !parent) {
            return undefined
        }

        const replacement = flattenDirective(node as Nodes, page.body)
        if (!replacement) {
            return undefined
        }
        ;(parent as Parent).children.splice(index, 1, ...replacement)
        // The replacement can hold directives of its own: visit it next.
        return [SKIP, index]
    })

    visit(tree, ['link', 'definition', 'image'], (node) => {
        if (!('url' in node) || typeof node.url !== 'string') {
            return
        }

        // A local image is served where the build put it, not beside the Markdown;
        // a definition can hold one for an image reference.
        const built = node.type === 'link' ? undefined : page.images?.get(node.url)
        node.url = rewriteUrl(built ?? node.url, page, context)
    })

    const intro: RootContent[] = []
    if (!hasTitle(tree)) {
        const title: Heading = { type: 'heading', depth: 1, children: [{ type: 'text', value: page.title }] }
        intro.push(title)
    }
    if (page.description) {
        intro.push({
            type: 'blockquote',
            children: [{ type: 'paragraph', children: [{ type: 'text', value: page.description }] }],
        })
    }

    const titleAt = tree.children.findIndex((node) => {
        return node.type === 'heading' && node.depth === 1
    })
    tree.children.splice(titleAt + 1, 0, ...intro)

    return stringify.stringify(tree).replace(ALERT_ESCAPE, '$1[!$2]')
}
