import type { AstroConfig, AstroIntegration, ShikiConfig } from 'astro'
import { isSatteriProcessor } from '@astrojs/markdown-satteri'
import remarkDirective from 'remark-directive'
import { paths, rehypeHeadingIdsEntry } from './src/paths.js'
import { rehypeHeadingLinks, rehypeTableWrapper } from './src/plugins/rehype.js'
import { remarkAlert } from './src/plugins/remark-alert.js'
import remarkCodeTabs from './src/plugins/remark-code-tabs.js'
import remarkToc from './src/plugins/remark-toc.js'
import {
    satteriAlert,
    satteriCodeTabs,
    satteriDirectiveFallback,
    satteriHeadingLinks,
    satteriTableWrapper,
    satteriToc,
} from './src/plugins/satteri.js'
import { DEFAULT_SELECTOR } from './src/scripts/utils.js'

type MarkdownProcessor = AstroConfig['markdown']['processor']

/** The `unified()` options jaamd extends. Typed here: `@astrojs/markdown-remark` is optional. */
interface UnifiedOptions {
    remarkPlugins: unknown[]
    rehypePlugins: unknown[]
}

// Same check as Astro's `isUnifiedProcessor`.
const isUnified = (p: MarkdownProcessor): p is MarkdownProcessor & { options: UnifiedOptions } => p.name === 'unified'

/** Astro's default `shikiConfig.theme`, filled in before integrations run. */
const ASTRO_DEFAULT_THEME = 'github-dark'

/** Names of a Sätteri entry: definitions carry `name`, groups nest, factories have none. */
const satteriNames = (entry: unknown): string[] =>
    Array.isArray(entry)
        ? entry.flatMap(satteriNames)
        : entry && typeof entry === 'object' && 'name' in entry
          ? [String(entry.name)]
          : []

/** Name of a unified entry: the plugin function, alone or as `[plugin, options]`. */
const unifiedNames = (entry: unknown): string[] => {
    const fn = Array.isArray(entry) ? entry[0] : entry
    return typeof fn === 'function' && fn.name ? [fn.name] : []
}

/** Plugins whose names are not registered yet. Registering one twice would run it twice. */
function missing<T>(existing: readonly unknown[], plugins: T[], names: (entry: unknown) => string[]): T[] {
    const taken = new Set(existing.flatMap(names))
    return plugins.filter((p) => !names(p).some((name) => taken.has(name)))
}

export interface JaamdOptions {
    /**
     * CSS selector for the markdown content wrapper.
     * Must match the class on <MarkdownContent> (or your custom wrapper).
     * @default ".jaamd-content"
     */
    selector?: string

    /**
     * Shiki theme. `{ light, dark }` enables dual-theme mode, which switches on a
     * `.dark` class on `<html>`.
     *
     * Unset, `markdown.shikiConfig` is left as configured; "github-light" replaces
     * only Astro's own default ("github-dark" with no `themes`).
     * @default "github-light"
     */
    theme?: string | { light: string; dark: string }

    /**
     * Skip injecting the default CSS variable fallbacks (`@jaamd/jaamd/default`).
     *
     * No effect with `<MarkdownContent>`, which imports them statically.
     * Applies to custom wrappers.
     * @default false
     */
    noDefault?: boolean

    /**
     * Granular control over which markdown plugins are registered.
     * All enabled by default.
     */
    plugins?: {
        /** :::code-tabs directive. Requires `directive: true`. */
        codeTabs?: boolean
        /** :::toc directive. Requires `directive: true`. */
        toc?: boolean
        /** GitHub-style > [!NOTE] / [!WARNING] alerts */
        alerts?: boolean
        /** `:::` directive syntax (prerequisite for codeTabs and toc) */
        directive?: boolean
        /** Scroll container around tables */
        tables?: boolean
        /** Anchor link on every heading */
        headingLinks?: boolean
    }
}

/** Registers jaamd's markdown plugins on the configured processor and injects its stylesheets. */
export default function jaamd(options: JaamdOptions = {}): AstroIntegration {
    const { selector = DEFAULT_SELECTOR, theme, noDefault = false, plugins = {} } = options
    const { codeTabs = true, toc = true, alerts = true, directive = true, tables = true, headingLinks = true } = plugins

    return {
        name: '@jaamd/jaamd',
        hooks: {
            'astro:config:setup': ({ config, updateConfig, injectScript, logger }) => {
                const needsDirective = directive || codeTabs || toc

                const shikiConfig: ShikiConfig = { ...config.markdown.shikiConfig }
                const userThemes = Object.keys(shikiConfig.themes ?? {}).length > 0
                const userTheme = shikiConfig.theme !== ASTRO_DEFAULT_THEME
                const resolvedTheme = theme ?? (userThemes || userTheme ? undefined : 'github-light')

                // Dual-theme mode: { light, dark } → Shiki "themes" with CSS variables
                const isDualTheme = typeof resolvedTheme === 'object' && !!resolvedTheme.light && !!resolvedTheme.dark
                if (isDualTheme) {
                    delete shikiConfig.theme
                    shikiConfig.themes = {
                        light: resolvedTheme.light,
                        dark: resolvedTheme.dark,
                    } as ShikiConfig['themes']
                    shikiConfig.defaultColor = false
                } else if (typeof resolvedTheme === 'string') {
                    shikiConfig.theme = resolvedTheme as ShikiConfig['theme']
                }

                // Extended in place. New arrays, not unshift: a shared processor
                // would stack duplicates across setup runs.
                const processor = config.markdown.processor
                let registered: number
                let total: number

                if (isSatteriProcessor(processor)) {
                    const mdast = [
                        ...(alerts ? [satteriAlert] : []),
                        ...(codeTabs ? [satteriCodeTabs] : []),
                        ...(toc ? [satteriToc] : []),
                    ]
                    const existing = processor.options.mdastPlugins
                    const addedMdast = missing(existing, mdast, satteriNames)
                    // After the user's plugins.
                    const fallback = needsDirective ? missing(existing, [satteriDirectiveFallback], satteriNames) : []

                    processor.options.mdastPlugins = [...addedMdast, ...existing, ...fallback]
                    if (needsDirective) {
                        processor.options.features = { ...processor.options.features, directive: true }
                    }

                    const hast = [
                        ...(tables ? [satteriTableWrapper] : []),
                        ...(headingLinks ? [satteriHeadingLinks] : []),
                    ]
                    const existingHast = processor.options.hastPlugins
                    const addedHast = missing(existingHast, hast, satteriNames)

                    processor.options.hastPlugins = [...existingHast, ...addedHast]
                    ;[registered, total] = [addedMdast.length + addedHast.length, mdast.length + hast.length]
                } else if (isUnified(processor)) {
                    const remark = [
                        ...(alerts ? [remarkAlert] : []),
                        // directive must come before its consumers
                        ...(needsDirective ? [remarkDirective] : []),
                        ...(codeTabs ? [remarkCodeTabs] : []),
                        ...(toc ? [remarkToc] : []),
                    ]
                    const existing = processor.options.remarkPlugins
                    const addedRemark = missing(existing, remark, unifiedNames)
                    processor.options.remarkPlugins = [...addedRemark, ...existing]

                    const rehype = [
                        ...(tables ? [rehypeTableWrapper] : []),
                        ...(headingLinks ? [rehypeHeadingLinks] : []),
                    ]
                    const existingRehype = processor.options.rehypePlugins
                    const addedRehype = missing(existingRehype, rehype, unifiedNames)
                    processor.options.rehypePlugins = [
                        ...existingRehype,
                        // Astro's own id plugin, ahead of the links that read the ids.
                        ...addedRehype.flatMap((p) => (p === rehypeHeadingLinks ? [rehypeHeadingIdsEntry, p] : [p])),
                    ]

                    ;[registered, total] = [addedRemark.length + addedRehype.length, remark.length + rehype.length]
                } else {
                    logger.warn(
                        `markdown processor "${processor.name}" is neither Sätteri nor unified; jaamd's markdown plugins were not added. Pass them to your processor manually.`,
                    )
                    ;[registered, total] = [0, 0]
                }

                if (total > 0) {
                    logger.info(`markdown processor: ${processor.name}, registered ${registered}/${total} plugin(s)`)
                }

                updateConfig({
                    vite: {
                        // Without this, jaamd's .astro sources stay pre-bundled externals
                        // and never reach the Astro compiler.
                        ssr: { noExternal: ['@jaamd/jaamd'] },
                    },
                    markdown: { shikiConfig },
                })

                // "page-ssr": the stylesheets render as <link> tags in every page's <head>.
                injectScript(
                    'page-ssr',
                    [
                        ...(noDefault ? [] : [`import ${paths.variables};`]),
                        ...(isDualTheme ? [`import ${paths.shikiDual};`] : []),
                        `import ${paths.markdown};`,
                    ].join('\n'),
                )

                injectScript(
                    'page',
                    [
                        `import { initMarkdownEnhancements } from ${paths.client};`,
                        `function __jaamdRun() { initMarkdownEnhancements(${JSON.stringify(selector)}); }`,
                        `__jaamdRun();`,
                        `document.addEventListener("astro:page-load", __jaamdRun);`,
                    ].join('\n'),
                )

                logger.info('jaamd: markdown enhancements ready')
            },
        },
    }
}

// For manual processor setup
export {
    satteriAlert,
    satteriCodeTabs,
    satteriDirectiveFallback,
    satteriHeadingLinks,
    satteriTableWrapper,
    satteriToc,
} from './src/plugins/satteri.js'
export { rehypeHeadingLinks, rehypeTableWrapper } from './src/plugins/rehype.js'
export { default as remarkCodeTabs } from './src/plugins/remark-code-tabs.js'
export { default as remarkToc } from './src/plugins/remark-toc.js'
export { remarkAlert } from './src/plugins/remark-alert.js'
export { default as remarkDirective } from 'remark-directive'

export type { JaamdOptions as Options }
