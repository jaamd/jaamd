---
description: The colours of the interface, the Markdown and the code.
---

# `theme`

The colours of the interface, the rendered Markdown and the code blocks, light
and dark.

| Type                                        | Default     | Notes                          |
| ------------------------------------------- | ----------- | ------------------------------ |
| `string \| { light: string; dark: string }` | `"default"` | Site option, JAAB reads it too |

## Use cases

### A named theme

```ts
theme: 'catppuccin',
```

| Name             | Light         | Dark         |
| ---------------- | ------------- | ------------ |
| `default`        | Paper         | GitHub Dark  |
| `catppuccin`     | Latte         | Mocha        |
| `gruvbox`        | Gruvbox Light | Gruvbox Dark |
| `rose-pine`      | Dawn          | Rosé Pine    |
| `rose-pine-moon` | Dawn          | Moon         |
| `dracula`        | Dracula       | Dracula      |
| `nord`           | Nord          | Nord         |
| `one-dark`       | One Dark      | One Dark     |
| `tokyo-night`    | Tokyo Night   | Tokyo Night  |

A theme with one palette, as `dracula`, looks the same in light and dark mode:
pair it with [`appearance: 'dark'`](24-appearance.md) to drop the switcher.

### Only the code blocks

A pair of [Shiki themes](https://shiki.style/themes) changes the highlighting
and leaves the interface as it is:

```ts
theme: { light: 'github-light', dark: 'github-dark' },
```

### Colours of your own

Set the colours in `src/jaamd.css` instead: see
[Themes](../02-guides/03-themes.md#custom-themes).

## Limits

An unknown name stops the build.
