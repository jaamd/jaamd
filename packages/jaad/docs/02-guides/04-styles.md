---
description: Colours, fonts and widths as CSS custom properties in src/jaamd.css, and Tailwind.
---

# Styles

JAAD's look is a set of CSS custom properties. Override them in
`src/jaamd.css`, which loads after the bundled stylesheet on documentation
pages, on pages using `Page` and on [JAAB](https://docs.jaamd.org/jaab)'s
pages:

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
whole palette, see [Themes](03-themes.md).

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

A token does not load the font. Add the family with Astro's fonts, in
[`astro`](../03-configuration/27-astro.md), then point the token at its CSS
variable:

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

| Token                  | Default                                           |
| ---------------------- | ------------------------------------------------- |
| `--site-chrome-width`  | content, both sidebars and their gaps             |
| `--site-content-width` | `56rem`, the most the page column takes           |
| `--site-sidebar-width` | `16rem`, the navigation and the table of contents |
| `--site-page-padding`  | `2rem`, on each side of the page                  |
| `--site-header-height` | `4.25rem`, the fixed header                       |

`--site-chrome-width` is the column the header, the sidebars and the page share.
The header and the two sidebars are fixed to the window, and only the page
scrolls; raise `--site-header-height` along with a logo taller than the header.
Set it to fit the documentation to the width of the rest of a site; the page
column takes what the sidebars leave, up to `--site-content-width`:

```css
:root {
    --site-chrome-width: 80rem;
    --site-sidebar-width: 14rem;
}
```

Use [Advanced layout](06-advanced-layout.md) when the tokens are not
enough.

## Tailwind

With [`tailwind: true`](../03-configuration/25-tailwind.md), utilities read
these tokens: `bg-surface`, `text-primary`, `max-w-(--site-chrome-width)`.
