# Other frameworks

`@jaamd/core` is the part of JAAMD with no framework around it: the markdown
plugins, the client script, the stylesheets and the themes. `@jaamd/astro`
registers all of it; install core directly to bring JAAMD to another framework.

```bash
npm install @jaamd/core
```

The package ships TypeScript sources, compiled by your bundler.

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

## Client and styles

Load `default.css` and `styles.css`, wrap the rendered HTML in an element with
the `jaamd-content` class, and call `initMarkdownEnhancements` on it once the
HTML is in the page. The markup the plugins emit is listed in
[Markup and classes](../04-styling/03-markup.md).
