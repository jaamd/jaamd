/** rehype plugins for the unified processor. */

import type { Element, ElementContent, Root } from 'hast'
import type { Plugin } from 'unified'
import { visit } from 'unist-util-visit'
import { CLASS, DEFAULT_LABELS } from '../markup.ts'
import { headingLinkHtml } from '../render.ts'

/** Wraps tables in a scroll container. */
export const rehypeTableWrapper: Plugin<[], Root> = function rehypeTableWrapper() {
    return (tree) => {
        visit(tree, 'element', (node, index, parent) => {
            if (node.tagName !== 'table' || index === undefined || !parent) return

            const wrapper: Element = {
                type: 'element',
                tagName: 'div',
                properties: { className: [CLASS.tableWrapper] },
                children: [node],
            }
            parent.children[index] = wrapper
            return index + 1
        })
    }
}

/** Text of a heading: text nodes, raw HTML tags left out. */
function textOf(node: ElementContent): string {
    if (node.type === 'text') return node.value
    return 'children' in node ? node.children.map(textOf).join('') : ''
}

function hasExpression(node: ElementContent): boolean {
    if ((node.type as string) === 'mdxTextExpression') return true
    return 'children' in node && node.children.some(hasExpression)
}

export interface RehypeHeadingLinksOptions {
    /** Prefix of the anchor's name: "Link to section: Setup". */
    label?: string
}

/**
 * Appends the anchor to headings that have an id. Run the plugin that assigns
 * the ids before this one.
 */
export const rehypeHeadingLinks: Plugin<[RehypeHeadingLinksOptions?], Root> = function rehypeHeadingLinks(
    options = {},
) {
    const label = options.label ?? DEFAULT_LABELS.headingLink

    return (tree) => {
        visit(tree, 'element', (node) => {
            if (!/^h[1-6]$/.test(node.tagName)) return
            const id = node.properties.id
            // An MDX expression has no text yet: left to the client.
            if (typeof id !== 'string' || hasExpression(node)) return

            node.children.push({
                type: 'raw',
                value: headingLinkHtml(id, textOf(node), label),
            } as unknown as ElementContent)
        })
    }
}
