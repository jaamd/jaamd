/** remark and rehype plugins for the unified processor. */

import type { Labels } from '../markup.ts'
import type { Pluggable, PluggableList } from 'unified'
import remarkDirective from 'remark-directive'
import { resolveFeatures, type Features } from '../features.ts'
import { withLabels } from '../markup.ts'
import { remarkAlert } from './alert.ts'
import { remarkCodeTabs } from './code-tabs.ts'
import { rehypeHeadingLinks, rehypeTableWrapper } from './rehype.ts'
import { remarkSpoiler } from './spoiler.ts'
import { remarkToc } from './toc.ts'

export interface UnifiedOptions {
    features?: Features
    labels?: Partial<Labels>
    /** The plugin that gives headings their ids, placed before the links that
     *  read them. Without one, only headings that already have an id get a link. */
    headingIds?: Pluggable
}

/** JAAMD's plugins for a unified processor, in the order they have to run. */
export function unifiedPlugins(options: UnifiedOptions = {}): {
    remarkPlugins: PluggableList
    rehypePlugins: PluggableList
} {
    const on = resolveFeatures(options.features)
    const labels = withLabels(options.labels)

    return {
        remarkPlugins: [
            ...(on.alerts ? [remarkAlert] : []),
            // Before the plugins that read its nodes.
            ...(on.directives ? [remarkDirective] : []),
            ...(on.codeTabs ? [remarkCodeTabs] : []),
            ...(on.toc ? [[remarkToc, { label: labels.toc }] satisfies Pluggable] : []),
            ...(on.spoilers ? [remarkSpoiler] : []),
        ],
        rehypePlugins: [
            ...(on.tables ? [rehypeTableWrapper] : []),
            ...(on.headingLinks
                ? [
                      ...(options.headingIds ? [options.headingIds] : []),
                      [rehypeHeadingLinks, { label: labels.headingLink }] satisfies Pluggable,
                  ]
                : []),
        ],
    }
}

export {
    remarkAlert,
    remarkCodeTabs,
    remarkDirective,
    remarkSpoiler,
    remarkToc,
    rehypeHeadingLinks,
    rehypeTableWrapper,
}
export type { RemarkAlertOptions } from './alert.ts'
export type { RehypeHeadingLinksOptions } from './rehype.ts'
export type { RemarkTocOptions } from './toc.ts'
export type { Feature, Features } from '../features.ts'
export type { Labels } from '../markup.ts'
