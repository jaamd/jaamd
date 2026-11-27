import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/** The url a relative link in `fromFile` stands for, or null to leave it as written. */
export type LinkResolver = (href: string, fromFile: string) => string | null

interface HastNode {
    type: string
    tagName?: string
    properties?: Record<string, unknown>
    children?: HastNode[]
}

/** rehype: rewrites the links `resolve` knows into page urls. */
export function rehypeLinks(name: string, resolve: LinkResolver) {
    const plugin = () => {
        return (tree: HastNode, file: { path?: string }) => {
            const from = file.path
            if (!from) {
                return
            }

            const visit = (node: HastNode) => {
                const { properties } = node
                if (node.tagName === 'a' && properties && typeof properties.href === 'string') {
                    const resolved = resolve(properties.href, from)
                    if (resolved) {
                        properties.href = resolved
                    }
                }
                node.children?.forEach(visit)
            }
            visit(tree)
        }
    }
    // The name finds the plugin again on a later setup run.
    Object.defineProperty(plugin, 'name', { value: name })
    return plugin
}

interface SatteriContext {
    fileURL: URL | undefined
    setProperty(node: HastNode, name: string, value: string): void
}

/** Sätteri: rewrites the links `resolve` knows into page urls. */
export function satteriLinks(name: string, resolve: LinkResolver) {
    return {
        name,
        element: {
            filter: ['a'],
            visit(node: HastNode, ctx: SatteriContext) {
                const href = node.properties?.href
                if (typeof href !== 'string' || !ctx.fileURL) {
                    return
                }

                const resolved = resolve(href, fileURLToPath(ctx.fileURL))
                if (resolved) {
                    ctx.setProperty(node, 'href', resolved)
                }
            },
        },
    }
}

interface MarkdownProcessor {
    name: string
    options: { hastPlugins?: unknown[]; rehypePlugins?: unknown[] }
}

/** Adds the link plugin `name` to Astro's Markdown processor, Sätteri or
 *  unified. Setup runs again on every dev restart against the same processor:
 *  the plugin added last time is replaced, not stacked. */
export function installLinkPlugin(processor: unknown, name: string, resolve: LinkResolver): void {
    const markdown = processor as MarkdownProcessor
    const others = (plugins: unknown[] = []): unknown[] => {
        return plugins.filter((plugin) => {
            const named = (typeof plugin === 'function' || typeof plugin === 'object') && plugin !== null
            return !(named && (plugin as { name?: string }).name === name)
        })
    }

    if (markdown.name === 'satteri') {
        markdown.options.hastPlugins = [...others(markdown.options.hastPlugins), satteriLinks(name, resolve)]
    } else if (markdown.name === 'unified') {
        markdown.options.rehypePlugins = [...others(markdown.options.rehypePlugins), rehypeLinks(name, resolve)]
    }
}

/** The markdown file a relative link points at, absolute, and its fragment;
 *  null for a link to anything else: absolute, external, a fragment alone, or
 *  a file that is no markdown. */
export function markdownLinkTarget(href: string, fromFile: string): { file: string; hash: string } | null {
    if (/^([a-z][a-z\d+.-]*:|\/|#)/i.test(href)) {
        return null
    }

    const [path = '', hash = ''] = href.split('#', 2)
    if (!path.endsWith('.md')) {
        return null
    }

    try {
        return { file: resolve(dirname(fromFile), decodeURI(path)), hash }
    } catch {
        return null
    }
}
