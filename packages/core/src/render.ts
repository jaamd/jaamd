/** Markup shared by the remark and Sätteri plugins. */

import type { Data, Emphasis, Paragraph } from 'mdast'
import { CLASS, ICON, ID, labelled } from './markup.ts'

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}

export const ALERT_MARKER = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i
export const ALERT_LEGACY_MARKER = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)(?:\/(.*))?]/i

/** An inline node as both processors give it: text has a `value`. */
interface InlineNode {
    type: string
    value?: string
}

export interface AlertMarker<Node extends InlineNode = InlineNode> {
    /** The alert's type, lower case: `note`, `tip`, `important`, `warning`, `caution`. */
    type: string
    /** What a legacy marker writes after its slash, as `[!NOTE/Heads up]`; none otherwise. */
    title: string | undefined
    /** The text node the marker opens, and the node after it. */
    first: Node
    second: Node | undefined
    /** What the first text node keeps once the marker line is gone, or null
     *  when the marker was all of it. */
    rest: string | null
    /** The marker line ended with a hard break, which goes with it. */
    dropsBreak: boolean
    /** Nothing else is in the paragraph: it goes too. */
    emptiesParagraph: boolean
}

/**
 * The marker a blockquote's first paragraph opens with. As on GitHub, it must
 * be alone on its line: `> [!NOTE] text` stays a plain blockquote.
 */
export function readAlertMarker<Node extends InlineNode>(
    children: readonly Node[],
    marker: RegExp = ALERT_MARKER,
): AlertMarker<Node> | null {
    const [first, second] = children
    if (first?.type !== 'text' || first.value === undefined) {
        return null
    }

    const match = first.value.match(marker)
    const type = match?.[1]
    if (!match || type === undefined) {
        return null
    }
    const found = { type: type.toLowerCase(), title: match[2], first, second }

    const afterMarker = first.value.slice(match[0].length)
    const lineEnd = /^[ \t]*\n/.exec(afterMarker)
    if (lineEnd) {
        return { ...found, rest: afterMarker.slice(lineEnd[0].length), dropsBreak: false, emptiesParagraph: false }
    }

    if (afterMarker.trim() !== '') {
        return null
    }

    // The marker filled the text node: the line ends with the paragraph or a hard break.
    if (second === undefined) {
        return { ...found, rest: null, dropsBreak: false, emptiesParagraph: true }
    }
    if (second.type === 'break') {
        return { ...found, rest: null, dropsBreak: true, emptiesParagraph: children.length === 2 }
    }
    return null
}

/** mdast `data` that renders the node as another hast element. */
function asHast(hProperties: Record<string, unknown>, hName?: string): Data {
    return (hName ? { hName, hProperties } : { hProperties }) as Data
}

/** Blockquote `data` for the alert wrapper. */
export function alertData(alertType: string, tagName = 'div'): Data {
    return asHast({ className: [CLASS.alert, `${CLASS.alert}-${alertType}`], dir: 'auto' }, tagName)
}

/** Title paragraph: icon plus label. */
export function alertTitle(alertType: string, title: string): Paragraph {
    return {
        type: 'paragraph',
        children: [alertIcon(alertType), { type: 'text', value: title }],
        data: asHast({ className: CLASS.alertTitle, dir: 'auto' }),
    }
}

function alertIcon(type: string): Emphasis {
    return {
        type: 'emphasis',
        data: asHast(
            {
                className: [CLASS.alertIcon],
                viewBox: '0 0 16 16',
                width: '16',
                height: '16',
                ariaHidden: 'true',
            },
            'svg',
        ),
        children: [
            {
                type: 'emphasis',
                data: asHast({ d: pathData[type] ?? '' }, 'path'),
                children: [],
            },
        ],
    }
}

/** Directive `data` for a spoiler: a span inline, a div as a block. */
export function spoilerData(tagName: 'span' | 'div'): Data {
    return asHast({ className: [CLASS.spoiler] }, tagName)
}

/** Where the annotations of a code meta start: `{1,3}`, `/word/` or `key=value`. */
const META_ANNOTATION = /(?:^|\s)(?=\{|\/|[\w-]+=)/

/**
 * A code tab's meta, split into the label written first and the annotations
 * after it, which stay on the code block for the highlighter:
 * `npm {1}` is the label "npm" with `{1}` left on the block.
 */
export function splitCodeTabMeta(meta: string | null | undefined): { label: string; annotations: string | null } {
    if (!meta) {
        return { label: '', annotations: null }
    }

    const at = meta.search(META_ANNOTATION)
    if (at === -1) {
        return { label: meta.trim(), annotations: null }
    }

    const annotations = meta.slice(at).trim()
    return { label: meta.slice(0, at).trim(), annotations: annotations || null }
}

/** Tab label: the meta's label, then language, then "Tab N". */
export function codeTabLabel(
    code: { meta?: string | null | undefined; lang?: string | null | undefined },
    i: number,
): string {
    return splitCodeTabMeta(code.meta).label || code.lang || `Tab ${i + 1}`
}

/** FNV-1a, 32-bit, in base 36. */
function hash(text: string): string {
    let value = 0x811c9dc5
    for (const char of text) {
        value ^= char.codePointAt(0) ?? 0
        value = Math.imul(value, 0x01000193)
    }
    return (value >>> 0).toString(36)
}

/**
 * Id of one `:::code-tabs` group: a hash of the document's source and the
 * group's position in it. Groups of two documents on one page differ unless
 * the two documents are the same.
 */
export function codeTabsGroupId(source: string, index: number): string {
    return `${ID.codeTabs}${hash(`${index}\0${source}`)}`
}

/** The `[label]` remark-directive and Sätteri put in a flagged paragraph. */
function isDirectiveLabel(node: { type: string; data?: unknown }): boolean {
    const data = node.data as { directiveLabel?: boolean } | undefined
    return node.type === 'paragraph' && data?.directiveLabel === true
}

/**
 * The children of a `:::code-tabs` block, sorted into tabs: each code block
 * opens one, and what follows it up to the next goes in its panel. What comes
 * before the first code block stays ahead of the tabs; a `[label]` is dropped.
 */
export function groupCodeTabs<N extends { type: string; data?: unknown }, C extends N>(
    children: readonly N[],
    isCode: (node: N) => node is C,
): { leading: N[]; tabs: { code: C; after: N[] }[] } {
    const leading: N[] = []
    const tabs: { code: C; after: N[] }[] = []

    for (const child of children) {
        if (isCode(child)) {
            tabs.push({ code: child, after: [] })
            continue
        }
        if (isDirectiveLabel(child)) {
            continue
        }

        const current = tabs.at(-1)
        if (current) {
            current.after.push(child)
        } else {
            leading.push(child)
        }
    }

    return { leading, tabs }
}

/** HTML around the code blocks of one `:::code-tabs` group. */
export function codeTabsHtml(group: string, labels: string[]) {
    const tabId = (i: number) => {
        return `${group}-tab-${i}`
    }
    const panelId = (i: number) => {
        return `${group}-panel-${i}`
    }

    const buttons = labels
        .map((label, i) => {
            const selected = i === 0
            return (
                `<button class="${CLASS.codeTabButton}" id="${tabId(i)}" data-tab-index="${i}" role="tab" ` +
                `aria-selected="${selected}" aria-controls="${panelId(i)}" ` +
                // Roving tabindex: only the selected tab is in the tab order.
                `tabindex="${selected ? 0 : -1}">${escapeHtml(label)}</button>`
            )
        })
        .join('')

    return {
        open: `<div class="${CLASS.codeTabs}" id="${group}"><div class="${CLASS.codeTabButtons}" role="tablist">${buttons}</div>`,
        panelOpen: (i: number) => {
            return (
                `<div class="${CLASS.codeTabPanel}"${i === 0 ? ' data-active' : ''} ` +
                `id="${panelId(i)}" data-tab-index="${i}" role="tabpanel" ` +
                // Focusable so wide samples can be scrolled by keyboard.
                `aria-labelledby="${tabId(i)}" tabindex="0">`
            )
        },
        panelClose: `</div>`,
        close: `</div>`,
    }
}

/** Opening of the TOC landmark, named after its title or `fallback`. The
 *  title is a <p>: out of getHeadings(). */
export function tocOpenHtml(title: string, fallback: string): string {
    const titleHtml = title ? `<p class="${CLASS.tocTitle}">${escapeHtml(title)}</p>` : ''
    return `<nav class="${CLASS.toc}" aria-label="${escapeHtml(title || fallback)}">` + titleHtml
}

export const TOC_CLOSE_HTML = `</nav>`

/** Anchor appended to a heading. */
export function headingLinkHtml(id: string, text: string, label: string): string {
    return (
        `<a class="${CLASS.headingLink}" href="#${escapeHtml(id)}" ` +
        `aria-label="${escapeHtml(labelled(label, text))}">${ICON.headingLink}</a>`
    )
}

const pathData: Record<string, string> = {
    note: 'M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm8-6.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM6.5 7.75A.75.75 0 0 1 7.25 7h1a.75.75 0 0 1 .75.75v2.75h.25a.75.75 0 0 1 0 1.5h-2a.75.75 0 0 1 0-1.5h.25v-2h-.25a.75.75 0 0 1-.75-.75ZM8 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z',
    tip: 'M8 1.5c-2.363 0-4 1.69-4 3.75 0 .984.424 1.625.984 2.304l.214.253c.223.264.47.556.673.848.284.411.537.896.621 1.49a.75.75 0 0 1-1.484.211c-.04-.282-.163-.547-.37-.847a8.456 8.456 0 0 0-.542-.68c-.084-.1-.173-.205-.268-.32C3.201 7.75 2.5 6.766 2.5 5.25 2.5 2.31 4.863 0 8 0s5.5 2.31 5.5 5.25c0 1.516-.701 2.5-1.328 3.259-.095.115-.184.22-.268.319-.207.245-.383.453-.541.681-.208.3-.33.565-.37.847a.751.751 0 0 1-1.485-.212c.084-.593.337-1.078.621-1.489.203-.292.45-.584.673-.848.075-.088.147-.173.213-.253.561-.679.985-1.32.985-2.304 0-2.06-1.637-3.75-4-3.75ZM5.75 12h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1 0-1.5ZM6 15.25a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 0 1.5h-2.5a.75.75 0 0 1-.75-.75Z',
    important:
        'M0 1.75C0 .784.784 0 1.75 0h12.5C15.216 0 16 .784 16 1.75v9.5A1.75 1.75 0 0 1 14.25 13H8.06l-2.573 2.573A1.458 1.458 0 0 1 3 14.543V13H1.75A1.75 1.75 0 0 1 0 11.25Zm1.75-.25a.25.25 0 0 0-.25.25v9.5c0 .138.112.25.25.25h2a.75.75 0 0 1 .75.75v2.19l2.72-2.72a.749.749 0 0 1 .53-.22h6.5a.25.25 0 0 0 .25-.25v-9.5a.25.25 0 0 0-.25-.25Zm7 2.25v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 9a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z',
    warning:
        'M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0 1 14.082 15H1.918a1.75 1.75 0 0 1-1.543-2.575Zm1.763.707a.25.25 0 0 0-.44 0L1.698 13.132a.25.25 0 0 0 .22.368h12.164a.25.25 0 0 0 .22-.368Zm.53 3.996v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 11a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z',
    caution:
        'M4.47.22A.749.749 0 0 1 5 0h6c.199 0 .389.079.53.22l4.25 4.25c.141.14.22.331.22.53v6a.749.749 0 0 1-.22.53l-4.25 4.25A.749.749 0 0 1 11 16H5a.749.749 0 0 1-.53-.22L.22 11.53A.749.749 0 0 1 0 11V5c0-.199.079-.389.22-.53Zm.84 1.28L1.5 5.31v5.38l3.81 3.81h5.38l3.81-3.81V5.31L10.69 1.5ZM8 4a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 4Zm0 8a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z',
}
