---
description: Use @jaamd/core, the compiled framework-free part of JAAMD, with any framework.
---

# Other frameworks

`@jaamd/core` is the part of JAAMD with no framework around it: the markdown
plugins, the client script, the stylesheets and the themes. `@jaamd/astro`
registers all of it; install core directly to bring JAAMD to another framework.

:::code-tabs

```bash npm
npm install @jaamd/core
```

```bash pnpm
pnpm add @jaamd/core
```

```bash yarn
yarn add @jaamd/core
```

```bash bun
bun add @jaamd/core
```

:::

The package ships compiled JavaScript with its types: it loads in Node and in any bundler.

## Entry points

| Import                                                                | What                                                           |
| --------------------------------------------------------------------- | -------------------------------------------------------------- |
| `@jaamd/core/unified`                                                 | remark and rehype plugins                                      |
| `@jaamd/core/satteri`                                                 | Sätteri mdast and hast plugins                                 |
| `@jaamd/core/client`                                                  | `enhance(root, options)` and `DEFAULT_SELECTOR`                |
| `@jaamd/core/styles.css`                                              | The stylesheet                                                 |
| `@jaamd/core/default.css`                                             | Fallback values of the CSS variables                           |
| `@jaamd/core/shiki-dual.css`                                          | Light and dark code colours for a dual Shiki theme             |
| `@jaamd/core/themes`                                                  | The list of themes: slug, name, mode and matching Shiki theme  |
| `@jaamd/core/themes/<slug>.css`, `@jaamd/core/themes/<slug>/dark.css` | A theme, and its `html.dark` variant for single-palette themes |

## Plugins

`unifiedPlugins()` returns the remark and rehype plugins in the order they have
to run:

```ts
import { unifiedPlugins } from '@jaamd/core/unified'
import rehypeSlug from 'rehype-slug'
import rehypeStringify from 'rehype-stringify'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { unified } from 'unified'

const { remarkPlugins, rehypePlugins } = unifiedPlugins({ headingIds: rehypeSlug })

const html = await unified()
    .use(remarkParse)
    .use(remarkPlugins)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypePlugins)
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(source)
```

`allowDangerousHtml` keeps the HTML the plugins write, such as heading links and
code tabs: without it, `remark-rehype` and `rehype-stringify` drop it.

`satteriPlugins()` does the same for Sätteri, parser features included. Sätteri
gives headings no ids of its own, so this example adds GitHub's:

```ts
import { satteriPlugins } from '@jaamd/core/satteri'
import GithubSlugger from 'github-slugger'
import { markdownToHtml } from 'satteri'

/** GitHub's heading ids, numbered within one document. */
function headingIds() {
    const slugger = new GithubSlugger()
    return {
        name: 'heading-ids',
        element: {
            filter: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
            visit(node, ctx) {
                ctx.setProperty(node, 'id', slugger.slug(ctx.textContent(node)))
            },
        },
    }
}

const html = await markdownToHtml(source, satteriPlugins({ headingIds: headingIds() }))
```

Heading links are added to headings that have an `id`. Core assigns none:
`headingIds` is the plugin that does, placed before the links. Both entry
points also export each plugin on its own.

### Options

Both functions, and `enhance()` below, take the
[`features`](../01-getting-started/02-options.md#features) and
[`labels`](../01-getting-started/02-options.md#labels) options of the Astro
integration: `features` turns a feature off, `labels` replaces the English
strings JAAMD writes. Pass the same values to the build and to `enhance()`.

## Client and styles

Load `default.css` and `styles.css`, wrap the rendered HTML in an element with
the `jaamd-content` class, and call `enhance()` once the HTML is in the page:

```ts
import { enhance } from '@jaamd/core/client'

const dispose = enhance(element)
```

`enhance()` takes an element, or a selector for every wrapper on the page
(`.jaamd-content` by default). It returns a cleanup that releases the listeners
and observers it holds: call it before the markup is replaced. In React:

```tsx
useEffect(() => enhance(ref.current), [html])
```

The markup the plugins emit is listed in
[Markup and classes](../04-styling/03-markup.md).
