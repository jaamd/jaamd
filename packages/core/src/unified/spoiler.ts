import type { Root } from 'mdast'
import type { Plugin } from 'unified'
import { visit } from 'unist-util-visit'
import { spoilerData } from '../render.ts'

/**
 * Spoilers: `:spoiler[text]` inline, or a `:::spoiler` block. Hidden until the
 * reader activates them.
 *
 * Requires remark-directive to run before this plugin.
 */
export const remarkSpoiler: Plugin<[], Root> = function remarkSpoiler() {
    return (tree) => {
        visit(tree, ['textDirective', 'leafDirective', 'containerDirective'], (node) => {
            if (!('name' in node) || node.name !== 'spoiler') return
            node.data = { ...node.data, ...spoilerData(node.type === 'textDirective' ? 'span' : 'div') }
        })
    }
}
