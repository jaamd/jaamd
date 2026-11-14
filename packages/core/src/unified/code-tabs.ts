import type { Code, Root, RootContent } from 'mdast'
import type { Plugin } from 'unified'
import { visit } from 'unist-util-visit'
import { codeTabLabel, codeTabsGroupId, codeTabsHtml } from '../render.ts'

/**
 * Tabbed code blocks: a `:::code-tabs` container wrapping fenced blocks.
 * The meta string after the language is the tab label, falling back to the
 * language, then "Tab N".
 *
 * Requires remark-directive to run before this plugin.
 */
export const remarkCodeTabs: Plugin<[], Root> = function remarkCodeTabs() {
    return (tree) => {
        // Position of the group in the document, hashed into its id.
        let groupIndex = 0

        visit(tree, 'containerDirective', (node, index, parent) => {
            if (node.name !== 'code-tabs' || index === undefined || !parent) return

            const codeNodes = node.children.filter((child): child is Code => child.type === 'code')
            if (codeNodes.length === 0) return

            const html = codeTabsHtml(
                codeTabsGroupId(
                    groupIndex++,
                    codeNodes.map((code) => code.value),
                ),
                codeNodes.map(codeTabLabel),
            )

            const replacement: RootContent[] = [
                { type: 'html', value: html.open },
                ...codeNodes.flatMap((code, i): RootContent[] => [
                    { type: 'html', value: html.panelOpen(i) },
                    // Strip meta so Shiki doesn't render it as a title annotation
                    { ...code, meta: null },
                    { type: 'html', value: html.panelClose },
                ]),
                { type: 'html', value: html.close },
            ]

            ;(parent.children as RootContent[]).splice(index, 1, ...replacement)
            return index + replacement.length
        })
    }
}
