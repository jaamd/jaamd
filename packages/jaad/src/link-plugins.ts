import type { DocLinkContext } from './utils/links.ts'
import { fileURLToPath } from 'node:url'
import { resolveDocLink } from './utils/links.ts'

interface HastNode {
    type: string
    tagName?: string
    properties?: Record<string, unknown>
    children?: HastNode[]
}

/** rehype: rewrites relative links to markdown files into page urls. */
export function rehypeDocLinks(context: DocLinkContext) {
    return function jaadDocLinks() {
        return (tree: HastNode, file: { path?: string }) => {
            const from = file.path
            if (!from) return

            const visit = (node: HastNode) => {
                const href = node.tagName === 'a' ? node.properties?.href : undefined
                if (typeof href === 'string') {
                    const resolved = resolveDocLink(href, from, context)
                    if (resolved) node.properties!.href = resolved
                }
                node.children?.forEach(visit)
            }
            visit(tree)
        }
    }
}

interface SatteriContext {
    fileURL: URL | undefined
    setProperty(node: HastNode, name: string, value: string): void
}

/** Sätteri: rewrites relative links to markdown files into page urls. */
export function satteriDocLinks(context: DocLinkContext) {
    return {
        name: 'jaad-doc-links',
        element: {
            filter: ['a'],
            visit(node: HastNode, ctx: SatteriContext) {
                const href = node.properties?.href
                if (typeof href !== 'string' || !ctx.fileURL) return

                const resolved = resolveDocLink(href, fileURLToPath(ctx.fileURL), context)
                if (resolved) ctx.setProperty(node, 'href', resolved)
            },
        },
    }
}
