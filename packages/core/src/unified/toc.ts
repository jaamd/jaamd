import type { Nodes, Root, RootContent } from 'mdast'
import type { Plugin } from 'unified'
import { visit } from 'unist-util-visit'
import { DEFAULT_LABELS } from '../markup.ts'
import { TOC_CLOSE_HTML, tocOpenHtml } from '../render.ts'

export interface RemarkTocOptions {
    /** Name of a landmark written without a title. */
    label?: string
}

/** Plain text of a label paragraph. */
function textOf(node: Nodes): string {
    if ('value' in node) return node.value
    return 'children' in node ? node.children.map(textOf).join('') : ''
}

/**
 * Declared table of contents: a `:::toc` container wrapped in a landmark. The
 * list is the author's, nothing is generated. The optional directive label
 * becomes the title.
 *
 *     :::toc[On this page]
 *     - [Setup](#setup)
 *     :::
 *
 * Requires remark-directive to run before this plugin.
 */
export const remarkToc: Plugin<[RemarkTocOptions?], Root> = function remarkToc(options = {}) {
    const fallback = options.label ?? DEFAULT_LABELS.toc

    return (tree) => {
        visit(tree, 'containerDirective', (node, index, parent) => {
            if (node.name !== 'toc' || index === undefined || !parent) return

            const children = [...node.children]

            // remark-directive puts `[label]` in a flagged paragraph.
            const first = children[0]
            const title =
                first?.type === 'paragraph' && first.data?.directiveLabel === true
                    ? textOf(children.shift()!).trim()
                    : ''

            if (children.length === 0) return

            const replacement: RootContent[] = [
                { type: 'html', value: tocOpenHtml(title, fallback) },
                // Left as mdast: the list renders normally.
                ...children,
                { type: 'html', value: TOC_CLOSE_HTML },
            ]

            ;(parent.children as RootContent[]).splice(index, 1, ...replacement)
            return index + replacement.length
        })
    }
}
