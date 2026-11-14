import type { Features, Labels } from '@jaamd/core/client'
import type { HeadingText } from '@jaamd/core/satteri'
import type { AstroConfig, RehypePlugins, RemarkPlugins } from 'astro'
import { satteriPlugins as coreSatteriPlugins } from '@jaamd/core/satteri'
import { rehypeHeadingLinks, unifiedPlugins as coreUnifiedPlugins } from '@jaamd/core/unified'
import { satteriCollectHastText, satteriHeadingIdsPlugin } from './astro-satteri.ts'

export interface PluginOptions {
    /** Features to turn off. All on by default. */
    features?: Features
    /** Text JAAMD writes into the page. English by default. */
    labels?: Partial<Labels>
}

/** Astro's heading id plugin for unified, as a module URL: `@astrojs/markdown-remark`,
 *  an optional peer, imports it only when unified runs. */
const REHYPE_HEADING_IDS = new URL('./rehype-heading-ids.js', import.meta.url).href

/** The heading text Astro records, frontmatter expressions resolved. */
const headingText: HeadingText = (node, ctx) => {
    const raw = ctx.textContent(node)
    return raw.includes('frontmatter') ? satteriCollectHastText(node, ctx.data.astro?.frontmatter ?? {}) : raw
}

const isHeadingLinks = (plugin: unknown) => (Array.isArray(plugin) ? plugin[0] : plugin) === rehypeHeadingLinks

/** JAAMD's plugins for Astro's `unified()`, Astro's heading ids included. */
export function unifiedPlugins(options: PluginOptions = {}): {
    remarkPlugins: RemarkPlugins
    rehypePlugins: RehypePlugins
} {
    const preset = coreUnifiedPlugins(options)
    return {
        // unified's `[plugin, ...options]` is Astro's `[plugin, options]`.
        remarkPlugins: preset.remarkPlugins as RemarkPlugins,
        rehypePlugins: preset.rehypePlugins.flatMap((plugin) =>
            isHeadingLinks(plugin) ? [REHYPE_HEADING_IDS, plugin] : [plugin],
        ) as RehypePlugins,
    }
}

/** JAAMD's plugins for Astro's `satteri()`, Astro's heading ids included. */
export function satteriPlugins(options: PluginOptions = {}): ReturnType<typeof coreSatteriPlugins> {
    return coreSatteriPlugins({ ...options, headingIds: satteriHeadingIdsPlugin(), headingText })
}

type Processor = AstroConfig['markdown']['processor']

interface SatteriProcessorOptions {
    features?: Record<string, unknown>
    mdastPlugins: unknown[]
    hastPlugins: unknown[]
}

interface UnifiedProcessorOptions {
    remarkPlugins: unknown[]
    rehypePlugins: unknown[]
}

export interface Registration {
    /** Plugins added. */
    added: number
    /** Plugins JAAMD would add to an empty processor. */
    total: number
}

/** Names of a Sätteri entry: definitions carry `name`, groups nest, factories have none. */
const satteriNames = (entry: unknown): string[] =>
    Array.isArray(entry)
        ? entry.flatMap(satteriNames)
        : entry && typeof entry === 'object' && 'name' in entry
          ? [String(entry.name)]
          : []

/** Name of a unified entry: the plugin function or module, alone or as `[plugin, options]`. */
const unifiedNames = (entry: unknown): string[] => {
    const plugin = Array.isArray(entry) ? entry[0] : entry
    if (typeof plugin === 'string') return [plugin]
    return typeof plugin === 'function' && plugin.name ? [plugin.name] : []
}

/** Plugins whose names are not registered yet. Registering one twice would run it twice. */
function missing<T>(existing: readonly unknown[], plugins: readonly T[], names: (entry: unknown) => string[]): T[] {
    const taken = new Set(existing.flatMap(names))
    return plugins.filter((plugin) => !names(plugin).some((name) => taken.has(name)))
}

const isFallback = (plugin: { name: string }) => plugin.name === 'jaamd-directive-fallback'

/** Ahead of the user's mdast plugins, the directive fallback after them; hast plugins after the user's. */
function registerSatteri(processor: SatteriProcessorOptions, options: PluginOptions): Registration {
    const preset = satteriPlugins(options)
    const mdast = missing(processor.mdastPlugins, preset.mdastPlugins, satteriNames)
    const hast = missing(processor.hastPlugins, preset.hastPlugins, satteriNames)

    processor.mdastPlugins = [
        ...mdast.filter((plugin) => !isFallback(plugin)),
        ...processor.mdastPlugins,
        ...mdast.filter(isFallback),
    ]
    processor.hastPlugins = [...processor.hastPlugins, ...hast]
    if (preset.features.directive) processor.features = { ...processor.features, directive: true }

    return { added: mdast.length + hast.length, total: preset.mdastPlugins.length + preset.hastPlugins.length }
}

/** remark plugins ahead of the user's, rehype plugins after them. */
function registerUnified(processor: UnifiedProcessorOptions, options: PluginOptions): Registration {
    const preset = unifiedPlugins(options)
    const remark = missing(processor.remarkPlugins, preset.remarkPlugins, unifiedNames)
    const missingRehype = missing(processor.rehypePlugins, preset.rehypePlugins, unifiedNames)
    // Astro's ids come along only with the links that read them.
    const links = missingRehype.some(isHeadingLinks)
    const rehype = missingRehype.filter((plugin) => links || plugin !== REHYPE_HEADING_IDS)

    processor.remarkPlugins = [...remark, ...processor.remarkPlugins]
    processor.rehypePlugins = [...processor.rehypePlugins, ...rehype]

    return { added: remark.length + rehype.length, total: preset.remarkPlugins.length + preset.rehypePlugins.length }
}

/**
 * Adds JAAMD's plugins to Astro's processor, in place, skipping those already
 * there. New arrays each time: a processor shared across setup runs keeps no
 * duplicates. `null` for a processor other than Sätteri and unified.
 */
export function registerPlugins(processor: Processor, options: PluginOptions = {}): Registration | null {
    if (processor.name === 'satteri') {
        return registerSatteri(processor.options as SatteriProcessorOptions, options)
    }
    if (processor.name === 'unified') {
        return registerUnified(processor.options as UnifiedProcessorOptions, options)
    }
    return null
}
