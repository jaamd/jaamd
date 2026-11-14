/** Sätteri mdast and hast plugins. `:::` blocks require `features.directive`. */

import type { Features } from '../features.ts'
import type { Labels } from '../markup.ts'
import type {
    HastNode,
    HastPluginDefinition,
    HastPluginEntry,
    HastVisitorContext,
    MdastPluginDefinition,
    MdastVisitorContext,
} from 'satteri'
import { resolveFeatures } from '../features.ts'
import { CLASS, DEFAULT_LABELS, withLabels } from '../markup.ts'
import {
    ALERT_MARKER,
    TOC_CLOSE_HTML,
    alertData,
    alertTitle,
    codeTabLabel,
    codeTabsGroupId,
    codeTabsHtml,
    headingLinkHtml,
    spoilerData,
    tocOpenHtml,
} from '../render.ts'

/** GitHub-style `> [!NOTE]` alerts. */
export function satteriAlert(): MdastPluginDefinition {
    return {
        name: 'jaamd-alert',
        blockquote(node, ctx) {
            for (const paragraph of node.children) {
                if (paragraph.type !== 'paragraph') continue

                const [first, second] = paragraph.children
                if (first?.type !== 'text') continue
                const match = first.value.match(ALERT_MARKER)
                if (!match) continue

                const alertType = match[1].toLowerCase()

                if (first.value.includes('\n')) {
                    ctx.setProperty(first, 'value', first.value.replace(ALERT_MARKER, '').replace(/^\n+/, ''))
                } else {
                    // Marker is the whole first line: drop it and the following break.
                    ctx.removeNode(first)
                    if (second?.type === 'break') ctx.removeNode(second)
                }

                ctx.setProperty(node, 'data', alertData(alertType))
                ctx.prependChild(node, alertTitle(alertType, alertType.toUpperCase()))
                return
            }
        },
    }
}

/** `:::code-tabs` container wrapping fenced blocks. */
export function satteriCodeTabs(): MdastPluginDefinition {
    // Group counter per document, keyed on its data bag.
    const tabGroups = new WeakMap<object, number>()

    return {
        name: 'jaamd-code-tabs',
        containerDirective(node, ctx) {
            if (node.name !== 'code-tabs') return

            const codeNodes = node.children.filter((child) => child.type === 'code')
            if (codeNodes.length === 0) return

            const groupIndex = tabGroups.get(ctx.data) ?? 0
            tabGroups.set(ctx.data, groupIndex + 1)

            const html = codeTabsHtml(
                codeTabsGroupId(
                    groupIndex,
                    codeNodes.map((code) => code.value),
                ),
                codeNodes.map(codeTabLabel),
            )

            ctx.replaceNode(node, [
                { type: 'html', value: html.open },
                ...codeNodes.flatMap((codeNode, i) => [
                    { type: 'html' as const, value: html.panelOpen(i) },
                    // Strip meta so Shiki doesn't render it as a title annotation
                    { ...codeNode, meta: null },
                    { type: 'html' as const, value: html.panelClose },
                ]),
                { type: 'html', value: html.close },
            ])
        },
    }
}

export interface SatteriTocOptions {
    /** Name of a landmark written without a title. */
    label?: string
}

/** `:::toc` container: the author's list, wrapped in a landmark. */
export function satteriToc(options: SatteriTocOptions = {}): MdastPluginDefinition {
    const fallback = options.label ?? DEFAULT_LABELS.toc

    return {
        name: 'jaamd-toc',
        containerDirective(node, ctx) {
            if (node.name !== 'toc') return

            const children = [...node.children]

            // `[label]` arrives as a flagged paragraph.
            const first = children[0]
            const title =
                first?.type === 'paragraph' && first.data?.directiveLabel === true
                    ? ctx.textContent(children.shift()!).trim()
                    : ''

            if (children.length === 0) return

            ctx.replaceNode(node, [
                { type: 'html', value: tocOpenHtml(title, fallback) },
                // Left as mdast: the list renders normally.
                ...children,
                { type: 'html', value: TOC_CLOSE_HTML },
            ])
        },
    }
}

type Directive = Parameters<
    NonNullable<MdastPluginDefinition['containerDirective' | 'leafDirective' | 'textDirective']>
>[0]

const markSpoiler =
    (tagName: 'span' | 'div') =>
    (node: Directive, ctx: MdastVisitorContext): void => {
        if (node.name !== 'spoiler') return
        ctx.setProperty(node, 'data', { ...node.data, ...spoilerData(tagName) })
    }

/** Spoilers: `:spoiler[text]` inline, or a `:::spoiler` block. */
export function satteriSpoiler(): MdastPluginDefinition {
    return {
        name: 'jaamd-spoiler',
        textDirective: markSpoiler('span'),
        leafDirective: markSpoiler('div'),
        containerDirective: markSpoiler('div'),
    }
}

function isClaimed(node: { data?: object | null }): boolean {
    return !!node.data && 'hName' in node.data
}

function keepAsDiv(node: Directive, ctx: MdastVisitorContext): void {
    if (isClaimed(node)) return
    ctx.setProperty(node, 'data', { ...node.data, hName: 'div' })
}

/**
 * Keeps directives no plugin claimed, which Sätteri drops with their content.
 * Blocks become a plain `<div>`, an inline `:name` its source text. Runs last.
 */
export function satteriDirectiveFallback(): MdastPluginDefinition {
    return {
        name: 'jaamd-directive-fallback',
        options: { position: true },
        containerDirective: keepAsDiv,
        leafDirective: keepAsDiv,
        textDirective(node, ctx) {
            if (isClaimed(node)) return
            const { start, end } = node.position ?? {}
            if (start?.offset === undefined || end?.offset === undefined) return
            ctx.replaceNode(node, { type: 'text', value: ctx.source.slice(start.offset, end.offset) })
        },
    }
}

/** Wraps tables in a scroll container. */
export function satteriTableWrapper(): HastPluginDefinition {
    return {
        name: 'jaamd-table-wrapper',
        element: {
            filter: ['table'],
            visit(node, ctx) {
                ctx.wrapNode(node, {
                    type: 'element',
                    tagName: 'div',
                    properties: { className: [CLASS.tableWrapper] },
                    children: [],
                })
            },
        },
    }
}

/** Text of a heading, as the name of its anchor. */
export type HeadingText = (node: HastNode, ctx: HastVisitorContext) => string

export interface SatteriHeadingLinksOptions {
    /** The plugin that gives headings their ids, run first. */
    ids?: HastPluginEntry
    /** Reads a heading's text. The node's text content by default. */
    text?: HeadingText
    /** Prefix of the anchor's name: "Link to section: Setup". */
    label?: string
}

/** Appends the anchor to headings that have an id. */
export function satteriHeadingLinks(options: SatteriHeadingLinksOptions = {}): HastPluginEntry {
    const { ids, text = (node, ctx) => ctx.textContent(node), label = DEFAULT_LABELS.headingLink } = options

    const headingLinks: HastPluginDefinition = {
        name: 'jaamd-heading-links',
        element: {
            filter: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
            visit(node, ctx) {
                const id = node.properties?.id
                if (typeof id !== 'string') return
                ctx.appendChild(node, { type: 'raw', value: headingLinkHtml(id, text(node, ctx), label) })
            },
        },
    }

    return ids ? [ids, headingLinks] : headingLinks
}

export interface SatteriOptions {
    features?: Features
    labels?: Partial<Labels>
    /** The plugin that gives headings their ids. Without one, only headings
     *  that already have an id get a link. */
    headingIds?: HastPluginEntry
    headingText?: HeadingText
}

/** JAAMD's plugins for Sätteri, in the order they have to run, and the parser
 *  features they need. */
export function satteriPlugins(options: SatteriOptions = {}): {
    features: { directive: boolean }
    mdastPlugins: MdastPluginDefinition[]
    hastPlugins: HastPluginEntry[]
} {
    const on = resolveFeatures(options.features)
    const labels = withLabels(options.labels)

    return {
        features: { directive: on.directives },
        mdastPlugins: [
            ...(on.alerts ? [satteriAlert()] : []),
            ...(on.codeTabs ? [satteriCodeTabs()] : []),
            ...(on.toc ? [satteriToc({ label: labels.toc })] : []),
            ...(on.spoilers ? [satteriSpoiler()] : []),
            ...(on.directives ? [satteriDirectiveFallback()] : []),
        ],
        hastPlugins: [
            ...(on.tables ? [satteriTableWrapper()] : []),
            ...(on.headingLinks
                ? [
                      satteriHeadingLinks({
                          ids: options.headingIds,
                          text: options.headingText,
                          label: labels.headingLink,
                      }),
                  ]
                : []),
        ],
    }
}

export type { Feature, Features } from '../features.ts'
export type { Labels } from '../markup.ts'
