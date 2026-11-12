/** The plugins on a bare processor, with no framework around them. */

import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import rehypeStringify from 'rehype-stringify'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { markdownToHtml } from 'satteri'
import { unified } from 'unified'
import {
    satteriAlert,
    satteriCodeTabs,
    satteriDirectiveFallback,
    satteriHeadingLinks,
    satteriTableWrapper,
    satteriToc,
} from '../src/satteri.ts'
import {
    rehypeHeadingLinks,
    rehypeTableWrapper,
    remarkAlert,
    remarkCodeTabs,
    remarkDirective,
    remarkToc,
} from '../src/unified/index.ts'

const SOURCE = `## Setup

> [!WARNING]
> Careful.

:::code-tabs
\`\`\`bash npm
npm install
\`\`\`
\`\`\`bash pnpm
pnpm add
\`\`\`
:::

:::toc[On this page]
- [Setup](#setup)
:::

:::unknown
Kept.
:::

| a | b |
| - | - |
| 1 | 2 |
`

const slug = (text) => text.toLowerCase().replace(/ /g, '-')

/** Stand-in for the id plugin an adapter supplies. */
const rehypeIds = () => (tree) => {
    for (const node of tree.children) {
        if (node.type === 'element' && /^h[1-6]$/.test(node.tagName)) {
            node.properties.id = slug(node.children.map((child) => child.value ?? '').join(''))
        }
    }
}

const satteriIds = {
    name: 'test-heading-ids',
    element: {
        filter: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
        visit(node, ctx) {
            ctx.setProperty(node, 'id', slug(ctx.textContent(node)))
        },
    },
}

const processors = {
    async unified() {
        const file = await unified()
            .use(remarkParse)
            .use(remarkGfm)
            .use(remarkAlert)
            .use(remarkDirective)
            .use(remarkCodeTabs)
            .use(remarkToc)
            .use(remarkRehype, { allowDangerousHtml: true })
            .use(rehypeTableWrapper)
            .use(rehypeIds)
            .use(rehypeHeadingLinks)
            .use(rehypeStringify, { allowDangerousHtml: true })
            .process(SOURCE)
        return String(file)
    },
    async satteri() {
        const result = await markdownToHtml(SOURCE, {
            features: { directive: true },
            mdastPlugins: [satteriAlert, satteriCodeTabs, satteriToc, satteriDirectiveFallback],
            hastPlugins: [satteriTableWrapper, satteriHeadingLinks(satteriIds, (node, ctx) => ctx.textContent(node))],
        })
        return typeof result === 'string' ? result : result.html
    },
}

const count = (html, pattern) => (html.match(pattern) ?? []).length

for (const [name, render] of Object.entries(processors)) {
    describe(name, () => {
        test('alert', async () => {
            const html = await render()
            assert.match(html, /<div class="markdown-alert markdown-alert-warning" dir="auto">/)
            assert.match(html, /<p class="markdown-alert-title" dir="auto">/)
            assert.doesNotMatch(html, /\[!WARNING\]/)
        })

        test('code tabs', async () => {
            const html = await render()
            assert.match(html, /<div class="code-tabs" id="jaamd-tabs-[a-z0-9]+"/)
            assert.equal(count(html, /role="tab"/g), 2)
            assert.equal(count(html, /class="code-tab-panel/g), 2)
            assert.equal(count(html, /role="tab" aria-selected="true"/g), 1)
        })

        test('table of contents', async () => {
            const html = await render()
            assert.match(html, /<nav class="jaamd-toc" aria-label="On this page">/)
            assert.match(html, /<p class="jaamd-toc-title">On this page<\/p>/)
        })

        test('table wrapper', async () => {
            const html = await render()
            assert.match(html, /<div class="jaamd-table-wrapper"><table>/)
        })

        test('heading link', async () => {
            const html = await render()
            assert.match(
                html,
                /<h2 id="setup">Setup<a class="jaamd-heading-link" href="#setup" aria-label="Link to section: Setup">/,
            )
        })
    })
}

test('satteri keeps a directive no plugin claimed', async () => {
    assert.match(await processors.satteri(), /<div><p>Kept\.<\/p><\/div>/)
})

test('both processors give a code-tabs group the same id', async () => {
    const id = (html) => html.match(/id="(jaamd-tabs-[a-z0-9]+)"/)?.[1]
    const [a, b] = await Promise.all([processors.unified(), processors.satteri()])
    assert.ok(id(a))
    assert.equal(id(a), id(b))
})
