# Upgrading

## From @jaamd/jaamd

The package is now `@jaamd/astro`. Replace the dependency and every import from
`@jaamd/jaamd`; the API is unchanged. Coming from `@lancher-dev/jaamd`, do the
same with that name.

Stylesheets are imported with their extension: `@jaamd/astro/styles.css`, not
`@jaamd/astro/styles`. The same goes for `default`, `shiki-dual` and the themes.

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
