# Installation

```bash
npx astro add @jaamd/astro
```

Or install it and register it yourself:

```bash
npm install @jaamd/astro
```

```ts
// astro.config.mjs
import jaamd from '@jaamd/astro'
import { defineConfig } from 'astro/config'

export default defineConfig({
    integrations: [jaamd()],
})
```

## Requirements

| Requirement                | Detail                                                    |
| -------------------------- | --------------------------------------------------------- |
| Astro                      | `^7.3.0`                                                  |
| Node                       | `>=22.12.0`                                               |
| Markdown processor         | Sätteri (Astro's default) or `unified()`                  |
| `@astrojs/markdown-remark` | Only with `unified()`: an optional peer, installed by you |
| Toolchain                  | Must compile TypeScript and `.astro` sources              |

JAAMD is published as source, with no compiled `dist/` and no emitted `.d.ts`.
It works out of the box in any Astro project, but is not consumable from plain
Node, a CommonJS build, or a TypeScript project using
`"moduleResolution": "node16"`.

## Wrapping your content

Wrap your markdown content with the
[`MarkdownContent`](../03-usage/01-markdown-content.md) component in your
layout:

```astro
---
// src/layouts/BlogPost.astro
import MarkdownContent from '@jaamd/astro/components'
---

<MarkdownContent>
    <slot />
</MarkdownContent>
```

The integration registers its plugins on the configured markdown processor and
injects the stylesheet. No other configuration is required.

The processor is extended, never replaced: Sätteri gets mdast plugins and the
directive syntax, `unified()` gets the remark plugins. Any other processor is
left alone, with a warning.

> [!IMPORTANT]
> `<MarkdownContent>` loads the stylesheets for you. If you render markdown
> **without** it, import them yourself in your layout frontmatter:
>
> ```astro
> ---
> import '@jaamd/astro/default.css'
> import '@jaamd/astro/styles.css'
> ---
> ```
