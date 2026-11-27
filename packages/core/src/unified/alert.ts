/**
 * GitHub-style blockquote alerts. Inlined from remark-github-blockquote-alert
 * (MIT) to keep it out of consumer dependencies.
 * https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax#alerts
 */

import type { Root } from 'mdast'
import type { Plugin } from 'unified'
import { visit } from 'unist-util-visit'
import { ALERT_LEGACY_MARKER, ALERT_MARKER, alertData, alertTitle, readAlertMarker } from '../render.ts'

export interface RemarkAlertOptions {
    /**
     * Reads a title after a slash, as in `[!NOTE/Heads up]`.
     * @deprecated Kept for 1.x, removed in 2.0. Sätteri never read it.
     * @default false
     */
    legacyTitle?: boolean
    /**
     * HTML tag name for the alert wrapper.
     * @deprecated Kept for 1.x, removed in 2.0: the wrapper is a `div`, as on Sätteri.
     * @default "div"
     */
    tagName?: string
}

export const remarkAlert: Plugin<[RemarkAlertOptions?], Root> = function remarkJaamdAlert(options = {}) {
    const { legacyTitle = false, tagName = 'div' } = options
    const marker = legacyTitle ? ALERT_LEGACY_MARKER : ALERT_MARKER

    return (tree) => {
        visit(tree, 'blockquote', (node) => {
            const paragraph = node.children[0]
            if (paragraph?.type !== 'paragraph') {
                return
            }

            const found = readAlertMarker(paragraph.children, marker)
            if (!found) {
                return
            }

            const alertType = found.type
            const title = legacyTitle && found.title ? found.title : alertType.toUpperCase()

            if (found.emptiesParagraph) {
                node.children.shift()
            } else if (found.rest === null) {
                paragraph.children.splice(0, found.dropsBreak ? 2 : 1)
            } else {
                paragraph.children[0] = { type: 'text', value: found.rest }
            }

            node.data = alertData(alertType, tagName)
            node.children.unshift(alertTitle(alertType, title))
        })
    }
}
