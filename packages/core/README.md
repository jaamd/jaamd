# @jaamd/core

The framework-agnostic part of [JAAMD](https://jaamd.org): the markup, the
markdown plugins that emit it, the client script that enhances it, and the
stylesheets and themes that style it.

Astro projects install [`@jaamd/astro`](https://www.npmjs.com/package/@jaamd/astro),
which registers all of it. Use this package directly to bring JAAMD to another
framework.

The package ships compiled JavaScript with its types.

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

## Usage

```ts
import { unifiedPlugins } from '@jaamd/core/unified'

const { remarkPlugins, rehypePlugins } = unifiedPlugins()
```

```ts
import { satteriPlugins } from '@jaamd/core/satteri'
import { markdownToHtml } from 'satteri'

const html = await markdownToHtml(source, satteriPlugins())
```

```ts
import { enhance } from '@jaamd/core/client'

const dispose = enhance(element)
```

Options, labels and the React pattern are in
[Other frameworks](https://jaamd.org/docs/jaamd/advanced/other-frameworks).

## Markup

The emitted HTML and its classes are the public contract: stylesheets, themes
and the client script all rely on them. They are listed in
[Markup and classes](https://jaamd.org/docs/jaamd/styling/markup).
