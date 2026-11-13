# Options

```ts
jaamd({
    selector: '.jaamd-content', // CSS selector for the JS enhancements
    theme: 'github-light', // Shiki theme name (or { light, dark }); see below
    noDefault: false, // skip injecting @jaamd/astro/default.css variable fallbacks
    plugins: {
        codeTabs: true, // :::code-tabs directive blocks
        toc: true, // :::toc directive blocks
        alerts: true, // > [!NOTE] / [!WARNING] blockquote alerts
        directive: true, // `:::` syntax (prerequisite for codeTabs and toc)
        tables: true, // scroll container around tables
        headingLinks: true, // anchor link on every heading
    },
})
```

## `theme`

The Shiki theme for code blocks, or `{ light, dark }` for
[dual-theme mode](../04-styling/02-themes.md#dual-theme-shiki). Unset,
`markdown.shikiConfig` is left as configured; `"github-light"` replaces only
Astro's own default (`"github-dark"` with no `themes`).

## `selector`

Controls which element the **client-side JS enhancements** target at runtime.
It does not affect the CSS file, which always uses `.jaamd-content`.

- With `<MarkdownContent>`, leave it at the default.
- With a custom wrapper (e.g. `<div data-md>`), set `selector` to match it and
  provide your own CSS.

## `noDefault`

Set to `true` when you supply a complete `--jaamd-*` variable set of your own.
It has no effect on `<MarkdownContent>`, which imports the defaults directly;
with a custom wrapper, control them by importing `@jaamd/astro/default.css` or
not.

## `plugins`

Each feature can be turned off on its own. `codeTabs` and `toc` need
`directive`, the `:::` syntax they are written in.
