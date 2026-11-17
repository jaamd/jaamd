import type { Code, Root, RootContent } from 'mdast'
import type { Plugin } from 'unified'
import { visit } from 'unist-util-visit'
import { codeTabLabel, codeTabsGroupId, codeTabsHtml, groupCodeTabs, splitCodeTabMeta } from '../render.ts'

/**
 * Tabbed code blocks: a `:::code-tabs` container wrapping fenced blocks. The
 * label written first in a block's meta names its tab, falling back to the
 * language, then "Tab N"; annotations after it stay on the block.
 *
 * Requires remark-directive to run before this plugin.
 */
export const remarkCodeTabs: Plugin<[], Root> = function remarkCodeTabs() {
    return (tree, file) => {
        const source = String(file.value)
        // Position of the group in the document, hashed into its id.
        let groupIndex = 0

        visit(tree, 'containerDirective', (node, index, parent) => {
            if (node.name !== 'code-tabs' || index === undefined || !parent) {
                return
            }

            const { leading, tabs } = groupCodeTabs(node.children, (child): child is Code => child.type === 'code')
            if (tabs.length === 0) {
                return
            }

            const html = codeTabsHtml(
                codeTabsGroupId(source, groupIndex++),
                tabs.map(({ code }, i) => codeTabLabel(code, i)),
            )

            const replacement: RootContent[] = [
                ...leading,
                { type: 'html', value: html.open },
                ...tabs.flatMap(({ code, after }, i): RootContent[] => [
                    { type: 'html', value: html.panelOpen(i) },
                    { ...code, meta: splitCodeTabMeta(code.meta).annotations },
                    ...after,
                    { type: 'html', value: html.panelClose },
                ]),
                { type: 'html', value: html.close },
            ]

            ;(parent.children as RootContent[]).splice(index, 1, ...replacement)
            return index + replacement.length
        })
    }
}
