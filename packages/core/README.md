# @jaamd/core

The framework-agnostic part of [JAAMD](https://jaamd.org): the markup, the
markdown plugins that emit it, the client script that enhances it, and the
stylesheets and themes that style it.

Astro projects install [`@jaamd/astro`](https://www.npmjs.com/package/@jaamd/astro),
which registers all of it. Use this package directly to bring JAAMD to another
framework.

The package ships TypeScript sources, compiled by the consumer's bundler.

## Entry points

| Import                                                                | What                                                           |
| --------------------------------------------------------------------- | -------------------------------------------------------------- |
| `@jaamd/core/unified`                                                 | remark and rehype plugins                                      |
| `@jaamd/core/satteri`                                                 | Sätteri mdast and hast plugins                                 |
| `@jaamd/core/client`                                                  | `initMarkdownEnhancements(selector)` and `DEFAULT_SELECTOR`    |
| `@jaamd/core/styles.css`                                              | The stylesheet                                                 |
| `@jaamd/core/default.css`                                             | Fallback values of the CSS variables                           |
| `@jaamd/core/shiki-dual.css`                                          | Light and dark code colours for a dual Shiki theme             |
| `@jaamd/core/themes`                                                  | The list of themes: slug, name, mode and matching Shiki theme  |
| `@jaamd/core/themes/<slug>.css`, `@jaamd/core/themes/<slug>/dark.css` | A theme, and its `html.dark` variant for single-palette themes |

## Plugins

On unified, `remarkDirective` runs before `remarkCodeTabs` and `remarkToc`:

```ts
import {
    rehypeHeadingLinks,
    rehypeTableWrapper,
    remarkAlert,
    remarkCodeTabs,
    remarkDirective,
    remarkToc,
} from '@jaamd/core/unified'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { unified } from 'unified'

unified()
    .use(remarkParse)
    .use(remarkAlert)
    .use(remarkDirective)
    .use(remarkCodeTabs)
    .use(remarkToc)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeTableWrapper)
    .use(rehypeHeadingLinks)
```

On Sätteri, `:::` blocks need `features.directive`:

```ts
import {
    satteriAlert,
    satteriCodeTabs,
    satteriDirectiveFallback,
    satteriHeadingLinks,
    satteriTableWrapper,
    satteriToc,
} from '@jaamd/core/satteri'
import { markdownToHtml } from 'satteri'

markdownToHtml(source, {
    features: { directive: true },
    mdastPlugins: [satteriAlert, satteriCodeTabs, satteriToc, satteriDirectiveFallback],
    hastPlugins: [satteriTableWrapper, satteriHeadingLinks(headingIds, (node, ctx) => ctx.textContent(node))],
})
```

Heading links are added to headings that already have an `id`. Core assigns
none: on unified, run a plugin that does before `rehypeHeadingLinks`; on
Sätteri, pass one to `satteriHeadingLinks` as its first argument.

## Markup

The emitted HTML and its classes are the public contract: stylesheets, themes
and the client script all rely on them. They are listed in
[Markup and classes](https://jaamd.org/docs/jaamd/styling/markup).
