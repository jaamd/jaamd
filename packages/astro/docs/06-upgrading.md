---
description: The changes that need action, by the JAAMD version you upgrade from.
---

# Upgrading

Upgrade the integration, then read below the changes since the version you
upgrade from:

:::code-tabs

```bash npm
npm install @jaamd/astro@latest
```

```bash pnpm
pnpm add @jaamd/astro@latest
```

```bash yarn
yarn add @jaamd/astro@latest
```

```bash bun
bun add @jaamd/astro@latest
```

:::

## From 0.12

### The package is now @jaamd/astro

Replace the dependency, then every import from `@jaamd/jaamd`; the API of the
integration is unchanged. Coming from `@lancher-dev/jaamd`, do the same with
that name. `@jaamd/jaamd` is deprecated and receives no further releases.

:::code-tabs

```bash npm
npm uninstall @jaamd/jaamd
npm install @jaamd/astro
```

```bash pnpm
pnpm remove @jaamd/jaamd
pnpm add @jaamd/astro
```

```bash yarn
yarn remove @jaamd/jaamd
yarn add @jaamd/astro
```

```bash bun
bun remove @jaamd/jaamd
bun add @jaamd/astro
```

:::

### Stylesheets are imported with their extension

| Before                            | After                                 |
| --------------------------------- | ------------------------------------- |
| `@jaamd/jaamd/default`            | `@jaamd/astro/default.css`            |
| `@jaamd/jaamd/styles`             | `@jaamd/astro/styles.css`             |
| `@jaamd/jaamd/shiki-dual`         | `@jaamd/astro/shiki-dual.css`         |
| `@jaamd/jaamd/themes/<slug>`      | `@jaamd/astro/themes/<slug>.css`      |
| `@jaamd/jaamd/themes/<slug>/dark` | `@jaamd/astro/themes/<slug>/dark.css` |

### Classes

Every class JAAMD emits now starts with `jaamd-`, and states are attributes.
Update CSS of your own that selects on the old names:

| Before                                           | After                                                              |
| ------------------------------------------------ | ------------------------------------------------------------------ |
| `.code-tabs`                                     | `.jaamd-code-tabs`                                                 |
| `.code-tab-buttons`                              | `.jaamd-code-tab-buttons`                                          |
| `.code-tab-btn`, `.code-tab-btn.active`          | `.jaamd-code-tab-btn`, `.jaamd-code-tab-btn[aria-selected='true']` |
| `.code-tab-panel`, `.code-tab-panel.active`      | `.jaamd-code-tab-panel`, `.jaamd-code-tab-panel[data-active]`      |
| `.spoiler`, `.spoiler.revealed`                  | `.jaamd-spoiler`, `.jaamd-spoiler[data-revealed]`                  |
| `.jaamd-lightbox__img`, `.jaamd-lightbox__close` | `.jaamd-lightbox-img`, `.jaamd-lightbox-close`                     |

The alert classes (`markdown-alert`, `markdown-alert-title`) are unchanged.

### Spoilers

`<span class="spoiler">` is no longer a spoiler. Write `:spoiler[text]`, or
change the class to `jaamd-spoiler`.

### Client script

`initMarkdownEnhancements(selector)` is now `enhance(root, options)`, which
returns a cleanup. See [Client script](./03-usage/02-client.md).

### Options

| Before                      | After                         |
| --------------------------- | ----------------------------- |
| `noDefault: true`           | `defaultVariables: false`     |
| `plugins: { … }`            | `features: { … }`             |
| `plugins: { directive: … }` | `features: { directives: … }` |

`features` also turns off what runs only in the browser: `copyButtons`,
`lightbox`, and the client part of the others. `labels` is new: see
[Options](./01-getting-started/02-options.md#labels).

### Manual setup

`@jaamd/astro` no longer exports the plugins one by one. Use its presets,
`satteriPlugins()` and `unifiedPlugins()`, which also add Astro's heading ids:
see [Manual setup](./05-advanced/01-manual-setup.md). The single plugins are in
`@jaamd/core`.

## From 0.10

- `theme` no longer overrides `markdown.shikiConfig`. Unset, your Shiki
  configuration stays; `"github-light"` replaces only Astro's own default.
- `@astrojs/markdown-remark` is an optional peer dependency. Install it when you
  use `unified()`, which you import from it anyway.
- Code-tab ids are `jaamd-tabs-<hash>`, unique across every document on a page,
  instead of `jaamd-tabs-<n>`.
- Lightbox images are wrapped in `<button class="jaamd-lightbox-trigger">`, so
  they open from the keyboard. `img.jaamd-lightbox-enabled` is gone. See
  [Image lightbox](./03-usage/02-client.md#image-lightbox) for browser
  support.
- With a manual `unified()` setup, register Astro's `rehypeHeadingIds` before
  `rehypeHeadingLinks`, which now reads the ids instead of computing them.
  See [Manual setup](./05-advanced/01-manual-setup.md).
- Blockquote, alert, `h2` and `hr` borders are drawn without a CSS reset.
- Heading anchors are always visible below 600px, as intended.

## From 0.9

- jaamd no longer switches the markdown processor. With no configuration you
  are on Sätteri.
- Set `markdown.processor: unified()` to stay on unified.
- `markdown.remarkPlugins` and `markdown.rehypePlugins` still work: Astro moves
  to unified, jaamd adds its remark plugins.
- Astro `^7.3.0` is required.
- Heading anchors are plain links: a click navigates, nothing is copied.
- Table wrappers and heading anchors are in the built HTML. Turn them off with
  `plugins: { tables: false, headingLinks: false }`.
- The lightbox is a `<dialog class="jaamd-lightbox">`. `.jaamd-lightbox__backdrop`,
  `.jaamd-lightbox__content` and `.jaamd-lightbox--hidden` are gone: style
  `::backdrop` and `[open]`.
- `<details>` animates in CSS. `.jaamd-details-wrapper` and
  `.jaamd-details-inner` are gone.
