---
description: The --jaamd-* CSS custom properties that drive every JAAMD style.
---

# Variables

All styles are driven by CSS custom properties prefixed with `--jaamd-`. The
default set, `@jaamd/astro/default.css`, is injected automatically.

## Colours

Four seeds set most of the palette. These are the light defaults:

```css
:root {
    --jaamd-bg: #faf8f5;
    --jaamd-color-fg: #3a3a3a;
    --jaamd-color-fg-bright: #1a1a1a;
    --jaamd-color-primary: #2d2d2d;
}
```

Surfaces, borders and the table-of-contents card are derived from them with
`color-mix()`, supported in Chrome and Edge 111+, Safari 16.2+ and Firefox
113+. Heading borders and rules use relative colours, `rgb(from …)`, which need
Chrome and Edge 119+, Safari 16.4+ and Firefox 128+. Override any variable on
`:root` in your own stylesheet; for example:

```css
:root {
    --jaamd-color-primary-light: #818cf8;
    --jaamd-font-mono: ui-monospace, monospace;
}
```

Defaults live in `@layer jaamd.defaults`, so an unlayered `:root` block always
wins regardless of import order.

See [`variables.css`](https://github.com/jaamd/jaamd/blob/main/packages/core/src/styles/variables.css)
for every variable and its default value.

## Font sizes

`--jaamd-font-size` is the one knob for the whole document. Every other size is
derived from it, so moving it moves the entire scale in proportion:

```css
:root {
    --jaamd-font-size: 1rem; /* headings, code, tables… all follow */
}
```

To break a single element out of that scale, set its own token. Each is read
with the derived value as its fallback, so **an unset token changes nothing**;
they are opt-in, one at a time:

```css
:root {
    --jaamd-font-size: 1rem; /* the baseline */
    --jaamd-font-size-h1: 2.5rem; /* but h1 is fixed, not proportional */
    --jaamd-font-size-code-block: 0.8rem; /* and code blocks are tighter */
}
```

| Token                           | Applies to                         | Default when unset                       |
| ------------------------------- | ---------------------------------- | ---------------------------------------- |
| `--jaamd-font-size-h1` … `-h4`  | `h1`–`h4`                          | `2.22` / `1.67` / `1.33` / `1.11` × base |
| `--jaamd-font-size-h5`, `-h6`   | `h5`, `h6`                         | base                                     |
| `--jaamd-font-size-p`, `-li`    | paragraphs, list items             | base                                     |
| `--jaamd-font-size-blockquote`  | `blockquote`, contents included    | base                                     |
| `--jaamd-font-size-code`        | inline `` `code` ``                | `0.78` × base                            |
| `--jaamd-font-size-code-block`  | fenced code blocks                 | `0.85` × base                            |
| `--jaamd-font-size-table`       | `th` and `td` together             | `0.78` × base                            |
| `--jaamd-font-size-summary`     | `<details>` summary                | `0.89` × base                            |
| `--jaamd-font-size-alert-title` | alert titles                       | `0.83` × base                            |
| `--jaamd-font-size-toc`         | `:::toc` block, contents included  | `0.94` × base                            |
| `--jaamd-font-size-toc-title`   | `:::toc` title                     | `0.83` × base                            |
| `--jaamd-font-size-footnotes`   | footnotes block, contents included | `0.85` × base                            |

A block that owns a token governs what is inside it: paragraphs in a blockquote
follow `-blockquote`, not `-p`. Alert bodies have no token of their own and
follow `-p`; only their title is separate. The copy button, code-tab labels and
heading-link icons stay tied to `--jaamd-font-size`: they are JAAMD's chrome,
not your document's typography.

## Beyond the variables

When no variable covers what you want to change, override the rule itself.
JAAMD's rules sit outside any cascade layer and start from the wrapper, as in
`.jaamd-content h2`. A rule of yours wins when it is more specific, or as
specific and loaded later:

```css
.jaamd-content h2 {
    letter-spacing: -0.01em;
}
```

## Dark mode

The default set includes dark-mode overrides activated by the `dark` class on
`<html>`. Toggle the class and all JAAMD elements adapt.
