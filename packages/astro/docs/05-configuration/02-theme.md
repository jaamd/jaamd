---
description: The Shiki theme of the code blocks, one or a light and dark pair.
---

# `theme`

The [Shiki](https://shiki.style/themes) theme of the code blocks.

| Type                                        | Default                       |
| ------------------------------------------- | ----------------------------- |
| `string \| { light: string; dark: string }` | `markdown.shikiConfig` as set |

## Use cases

### One theme

```ts
jaamd({ theme: 'github-light' })
```

### A light and a dark theme

```ts
jaamd({ theme: { light: 'github-light', dark: 'github-dark' } })
```

The code follows the page's dark mode: see
[Dual-theme Shiki](../04-styling/02-themes.md#dual-theme-shiki).

### Astro's own setting

Leave it unset: `markdown.shikiConfig` stays as configured.

## Limits

A name has no effect while `markdown.shikiConfig.themes` is set, since Shiki
reads `themes` first: the build warns and keeps your `themes`.
