---
description: Tailwind utilities on JAAD's tokens, for pages and frames of your own.
---

# `tailwind`

Registers Tailwind, with JAAD's colours, fonts and dark mode as its theme.

| Type      | Default | Notes                          |
| --------- | ------- | ------------------------------ |
| `boolean` | `false` | Site option, JAAB reads it too |

Install Tailwind in the project first:

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
tailwind: true,
```

JAAD's own pages need nothing: its stylesheet is compiled.

## Use cases

### Pages on `Page`, and a frame of your own

Utilities read JAAD's tokens: `bg-surface`, `text-primary`,
`border-border-light`, `font-mono`. `dark:` follows the switcher, and the
layout tokens are arbitrary values, as `max-w-(--site-chrome-width)`. See
[Custom pages](../02-guides/05-custom-pages.md) and
[Advanced layout](../02-guides/06-advanced-layout.md).

### Pages on a layout of your own

They get plain Tailwind, without JAAD's tokens, by importing it in their CSS:

```css
@import 'tailwindcss';
```

## Limits

A project that registers `@tailwindcss/vite` itself, in `astro.vite.plugins`,
keeps its own: JAAD does not add it twice. Without Tailwind installed, the
build stops and names the command.
