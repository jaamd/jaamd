# Options

```ts
jaamd({
    selector: '.jaamd-content', // elements the client script enhances
    theme: 'github-light', // Shiki theme name, or { light, dark }; see below
    defaultVariables: true, // inject @jaamd/astro/default.css on every page
    features: {}, // features to turn off, such as { lightbox: false }
    labels: {}, // text JAAMD writes into the page
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

## `defaultVariables`

Set to `false` when you supply a complete `--jaamd-*` variable set of your own.
It has no effect on `<MarkdownContent>`, which imports the defaults directly;
with a custom wrapper, control them by importing `@jaamd/astro/default.css` or
not.

## `features`

Every feature is on. Set one to `false` to turn it off, in the build and in the
client script:

| Feature        | What                                         | Where         |
| -------------- | -------------------------------------------- | ------------- |
| `alerts`       | `> [!NOTE]` blockquotes                      | build         |
| `codeTabs`     | `:::code-tabs` blocks                        | build, client |
| `toc`          | `:::toc` blocks                              | build, client |
| `spoilers`     | `:spoiler[…]` and `:::spoiler`               | build, client |
| `directives`   | The `:::` syntax, for directives of your own | build         |
| `tables`       | Scroll container around tables               | build, client |
| `headingLinks` | Anchor on every heading                      | build, client |
| `copyButtons`  | Copy button on code blocks                   | client        |
| `lightbox`     | Images open in a dialog                      | client        |

`directives` stays on while `codeTabs`, `toc` or `spoilers` is, since they are
written in it.

## `labels`

The text JAAMD writes into the page, in English by default. Set the ones to
translate:

```ts
jaamd({ labels: { copy: 'Copia il codice', headingLink: 'Link alla sezione' } })
```

| Label           | Default                                           |
| --------------- | ------------------------------------------------- |
| `headingLink`   | `Link to section`, followed by the heading        |
| `toc`           | `Table of contents`, for a `:::toc` without title |
| `copy`          | `Copy code`                                       |
| `copied`        | `Code copied to clipboard`                        |
| `copySelected`  | `Code selected: copy it with your keyboard`       |
| `lightbox`      | `Image preview`                                   |
| `lightboxOpen`  | `Enlarge image`, followed by the alt text         |
| `lightboxClose` | `Close image preview`                             |
| `spoiler`       | `Spoiler`                                         |
