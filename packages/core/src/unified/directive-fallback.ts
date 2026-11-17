import type { Root, Text } from 'mdast'
import type { Plugin } from 'unified'
import { visit } from 'unist-util-visit'

/**
 * Gives inline directives no plugin claimed back their source text: `10:30`
 * and `Error:Fatal` parse as the directives `:30` and `:Fatal`, which would
 * render as an empty `<div>` inside the paragraph. Unclaimed blocks already
 * render as a `<div>` with their content. Runs after every plugin that reads
 * directives.
 */
export const remarkDirectiveFallback: Plugin<[], Root> = function remarkJaamdDirectiveFallback() {
    return (tree, file) => {
        const source = String(file.value)

        visit(tree, 'textDirective', (node, index, parent) => {
            if (index === undefined || !parent) {
                return
            }
            if (node.data && 'hName' in node.data) {
                return
            }

            const start = node.position?.start.offset
            const end = node.position?.end.offset
            if (start === undefined || end === undefined) {
                return
            }

            const text: Text = { type: 'text', value: source.slice(start, end) }
            parent.children.splice(index, 1, text)
        })
    }
}
