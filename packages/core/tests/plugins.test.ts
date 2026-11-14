/** The plugins on a bare processor, with no framework around them. */

import type { Element, Root } from 'hast'
import type { HastPluginDefinition } from 'satteri'
import type { Plugin } from 'unified'
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import rehypeStringify from 'rehype-stringify'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { markdownToHtml } from 'satteri'
import { unified } from 'unified'
import { satteriPlugins, type SatteriOptions } from '../src/satteri/index.ts'
import { unifiedPlugins, type UnifiedOptions } from '../src/unified/index.ts'

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

:::toc
- [Setup](#setup)
:::

The butler :spoiler[did it].

:::spoiler
Hidden block.
:::

:::unknown
Kept.
:::

| a | b |
| - | - |
| 1 | 2 |
`

const slug = (text: string) => text.toLowerCase().replace(/ /g, '-')

/** Stand-ins for the id plugin an adapter supplies. */
const rehypeIds: Plugin<[], Root> = () => (tree) => {
    for (const node of tree.children) {
        if (node.type !== 'element' || !/^h[1-6]$/.test(node.tagName)) continue
        const text = (node as Element).children.map((child) => ('value' in child ? child.value : '')).join('')
        node.properties.id = slug(text)
    }
}

const satteriIds: HastPluginDefinition = {
    name: 'test-heading-ids',
    element: {
        filter: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
        visit(node, ctx) {
            ctx.setProperty(node, 'id', slug(ctx.textContent(node)))
        },
    },
}

type Options = Pick<UnifiedOptions & SatteriOptions, 'features' | 'labels'>

const processors = {
    async unified(options: Options = {}, source = SOURCE) {
        const { remarkPlugins, rehypePlugins } = unifiedPlugins({ ...options, headingIds: rehypeIds })
        const file = await unified()
            .use(remarkParse)
            .use(remarkGfm)
            .use(remarkPlugins)
            .use(remarkRehype, { allowDangerousHtml: true })
            .use(rehypePlugins)
            .use(rehypeStringify, { allowDangerousHtml: true })
            .process(source)
        return String(file)
    },
    async satteri(options: Options = {}, source = SOURCE) {
        const result = await markdownToHtml(source, satteriPlugins({ ...options, headingIds: satteriIds }))
        return typeof result === 'string' ? result : result.html
    },
}

const count = (html: string, pattern: RegExp) => (html.match(pattern) ?? []).length

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
            assert.match(html, /<div class="jaamd-code-tabs" id="jaamd-tabs-[a-z0-9]+"/)
            assert.equal(count(html, /class="jaamd-code-tab-btn"/g), 2)
            assert.equal(count(html, /class="jaamd-code-tab-panel"/g), 2)
            assert.equal(count(html, /role="tab" aria-selected="true"/g), 1)
            assert.equal(count(html, /class="jaamd-code-tab-panel" data-active/g), 1)
        })

        test('table of contents', async () => {
            const html = await render()
            assert.match(html, /<nav class="jaamd-toc" aria-label="On this page">/)
            assert.match(html, /<p class="jaamd-toc-title">On this page<\/p>/)
            assert.match(html, /<nav class="jaamd-toc" aria-label="Table of contents">\s*<ul>/)
        })

        test('spoilers, inline and as a block', async () => {
            const html = await render()
            assert.match(html, /The butler <span class="jaamd-spoiler">did it<\/span>\./)
            assert.match(html, /<div class="jaamd-spoiler"><p>Hidden block\.<\/p><\/div>/)
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

        test('labels replace the English ones', async () => {
            const html = await render({ labels: { headingLink: 'Vai alla sezione', toc: 'Indice' } })
            assert.match(html, /aria-label="Vai alla sezione: Setup"/)
            assert.match(html, /<nav class="jaamd-toc" aria-label="Indice">\s*<ul>/)
        })

        test('a feature turned off leaves its markdown alone', async () => {
            const html = await render({ features: { alerts: false, tables: false, headingLinks: false } })
            assert.doesNotMatch(html, /markdown-alert|jaamd-table-wrapper|jaamd-heading-link/)
            assert.match(html, /<blockquote>/)
            assert.match(html, /jaamd-code-tabs/)
        })

        test('a block keeps the directive syntax on, whatever `directives` says', async () => {
            const html = await render({ features: { directives: false } })
            assert.match(html, /jaamd-code-tabs/)
        })

        test('without any block, `directives: false` leaves `:::` as text', async () => {
            const html = await render(
                { features: { directives: false, codeTabs: false, toc: false, spoilers: false } },
                ':::note\nPlain.\n:::\n',
            )
            assert.match(html, /:::note/)
        })
    })
}

test('satteri keeps a directive no plugin claimed', async () => {
    assert.match(await processors.satteri(), /<div><p>Kept\.<\/p><\/div>/)
})

test('both processors give a code-tabs group the same id', async () => {
    const id = (html: string) => html.match(/id="(jaamd-tabs-[a-z0-9]+)"/)?.[1]
    const [a, b] = await Promise.all([processors.unified(), processors.satteri()])
    assert.ok(id(a))
    assert.equal(id(a), id(b))
})

test('without an id plugin, headings that have no id get no link', async () => {
    const { remarkPlugins, rehypePlugins } = unifiedPlugins()
    const html = String(
        await unified()
            .use(remarkParse)
            .use(remarkPlugins)
            .use(remarkRehype)
            .use(rehypePlugins)
            .use(rehypeStringify)
            .process('## Setup'),
    )
    assert.equal(html, '<h2>Setup</h2>')
})
