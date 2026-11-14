import { unifiedPlugins } from '@jaamd/core/unified'
import GithubSlugger from 'github-slugger'
import rehypeStringify from 'rehype-stringify'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { unified } from 'unified'

interface Node {
    type: string
    tagName?: string
    value?: string
    properties?: Record<string, unknown>
    children?: Node[]
}

const HEADING = /^h[1-6]$/

const textOf = (node: Node): string =>
    node.type === 'text' ? (node.value ?? '') : (node.children ?? []).map(textOf).join('')

/** Gives every heading without an id the one GitHub would. */
function rehypeHeadingIds() {
    return (tree: Node) => {
        const slugger = new GithubSlugger()
        const visit = (node: Node) => {
            if (node.type === 'element' && node.properties && HEADING.test(node.tagName ?? '') && !node.properties.id) {
                node.properties.id = slugger.slug(textOf(node))
            }
            node.children?.forEach(visit)
        }
        visit(tree)
    }
}

const { remarkPlugins, rehypePlugins } = unifiedPlugins({ headingIds: rehypeHeadingIds })

const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkPlugins)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypePlugins)
    .use(rehypeStringify, { allowDangerousHtml: true })

/** Markdown to HTML with JAAMD's plugins, the same at build and in the browser. */
export function render(markdown: string): string {
    return String(processor.processSync(markdown))
}
