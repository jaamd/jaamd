import { unifiedPlugins } from '@jaamd/core/unified'
import rehypeSlug from 'rehype-slug'
import rehypeStringify from 'rehype-stringify'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { unified } from 'unified'

const { remarkPlugins, rehypePlugins } = unifiedPlugins({ headingIds: rehypeSlug })

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
