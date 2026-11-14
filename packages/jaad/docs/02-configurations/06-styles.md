---
description: Colours, fonts and widths as CSS custom properties in src/jaad.css, and Tailwind.
---

# Styles

JAAD's look is a set of CSS custom properties. Override them in
`src/jaad.css`, which loads after the bundled stylesheet on documentation pages
and on pages using `Page`:

```css
:root {
    --color-primary: #3b5bdb;
    --color-background: #ffffff;
}

html.dark {
    --color-primary: #748ffc;
    --color-background: #0d1117;
}
```

JAAD ships its stylesheet compiled and adds nothing to your project. Use any
CSS for pages of your own.

## Colour tokens

| Token                | Purpose                          |
| -------------------- | -------------------------------- |
| `--color-background` | Page background                  |
| `--color-foreground` | Body text                        |
| `--color-primary`    | Links, accents and active states |
| `--color-surface`    | Raised surfaces                  |
| `--color-border`     | Separators and outlines          |

The complete groups are:

- Backgrounds: `--color-background`, `--color-background-secondary`,
  `--color-background-tertiary`, `--color-surface`, `--color-surface-hover`.
- Text: `--color-foreground`, `--color-foreground-secondary`,
  `--color-foreground-muted`, `--color-foreground-bright`.
- Accent: `--color-primary`, `--color-primary-dark`, `--color-primary-light`.
- Borders: `--color-border`, `--color-border-light`, `--color-border-dark`.
- Status: `--color-error`, `--color-warning`, `--color-info`, `--color-success`.

The rendered Markdown follows these colours. To change it alone, set JAAMD's
`--jaamd-*` [variables](../../../astro/docs/04-styling/01-variables.md). For a
whole palette, see [Themes](05-themes.md).

## Fonts

JAAD uses self-hosted Inter for the interface and Merriweather for headings.
Three tokens choose the families:

```css
:root {
    --font-sans: 'IBM Plex Sans', system-ui, sans-serif;
    --font-serif: 'IBM Plex Serif', Georgia, serif;
    --font-mono: 'IBM Plex Mono', monospace;
}
```

A token does not load the font. Add the family with Astro's font
configuration, then point the token at its CSS variable:

```ts
// jaad.config.ts
import { defineJaadConfig } from '@jaamd/jaad'
import { fontProviders } from 'astro/config'

export default defineJaadConfig({
    title: 'My Project',
    astro: {
        fonts: [
            {
                provider: fontProviders.google(),
                name: 'IBM Plex Sans',
                cssVariable: '--font-plex',
                weights: [400, 600],
            },
        ],
    },
})
```

```css
:root {
    --font-sans: var(--font-plex), system-ui, sans-serif;
}
```

For system fonts only, point the tokens at a system stack. JAAD's bundled
fonts are still downloaded during the build even when unused.

## Layout tokens

| Token                  | Default                         |
| ---------------------- | ------------------------------- |
| `--jaad-content-width` | `56rem`                         |
| `--jaad-chrome-width`  | the content width               |
| `--jaad-sidebar-width` | `16rem`                         |
| `--jaad-page-padding`  | `2rem`                          |
| `--jaad-header-height` | `4.25rem`, where sidebars start |

```css
:root {
    --jaad-content-width: 64rem;
    --jaad-sidebar-width: 18rem;
}
```

`--jaad-chrome-width` is the width of the header and footer. Raise
`--jaad-header-height` along with a logo taller than the header.

Use [Advanced layout](08-advanced-layout.md) when token changes are not
enough.

## Tailwind

:::code-tabs

```bash npm
npm i -D tailwindcss @tailwindcss/vite
```

```bash pnpm
pnpm add -D tailwindcss @tailwindcss/vite
```

```bash yarn
yarn add -D tailwindcss @tailwindcss/vite
```

```bash bun
bun add -d tailwindcss @tailwindcss/vite
```

:::

```ts
// jaad.config.ts
defineJaadConfig({ title: 'My Project', tailwind: true })
```

JAAD registers the plugin, unless `astro.vite.plugins` already has it.

- Applies to documentation pages, pages using `Page` and a custom `DocsFrame`.
- Colours and fonts follow JAAD's tokens: `bg-surface`, `border-border-light`,
  `font-mono`.
- `dark:` follows JAAD's theme switch.
- Layout tokens via arbitrary values: `max-w-(--jaad-chrome-width)`.
- Pages on a local layout get plain Tailwind (no JAAD tokens) by adding
  `@import "tailwindcss";` to their CSS.
