# Themes

## Theme presets

Eight presets restyle the `--jaamd-*` palette to match popular editor colour
schemes. A **dual** preset carries a light and a dark palette and follows
`html.dark`; the others are one palette that applies in both modes.

| Preset         | Import                                   | Kind | Recommended Shiki theme                        |
| -------------- | ---------------------------------------- | ---- | ---------------------------------------------- |
| Catppuccin     | `@jaamd/astro/themes/catppuccin.css`     | dual | `catppuccin-latte` / `catppuccin-mocha`        |
| Dracula        | `@jaamd/astro/themes/dracula.css`        | dark | `dracula`                                      |
| Gruvbox        | `@jaamd/astro/themes/gruvbox.css`        | dual | `gruvbox-light-medium` / `gruvbox-dark-medium` |
| Nord           | `@jaamd/astro/themes/nord.css`           | dark | `nord`                                         |
| One Dark       | `@jaamd/astro/themes/one-dark.css`       | dark | `one-dark-pro`                                 |
| Rosé Pine      | `@jaamd/astro/themes/rose-pine.css`      | dual | `rose-pine-dawn` / `rose-pine`                 |
| Rosé Pine Moon | `@jaamd/astro/themes/rose-pine-moon.css` | dual | `rose-pine-dawn` / `rose-pine-moon`            |
| Tokyo Night    | `@jaamd/astro/themes/tokyo-night.css`    | dark | `tokyo-night`                                  |

As a standalone theme, replacing the default light theme:

```ts
jaamd({ theme: 'dracula' })
```

```css
@import '@jaamd/astro/default.css';
@import '@jaamd/astro/themes/dracula.css';
@import '@jaamd/astro/styles.css';
```

A single-palette preset can also be scoped to `html.dark` via the `/dark`
variant, to use it as the dark half of your own light theme. Dual presets
already cover both modes and have no `/dark`:

```css
@import '@jaamd/astro/themes/dracula/dark.css';
```

```ts
import '@jaamd/astro/themes/dracula/dark.css'
```

> [!IMPORTANT]
> A preset declares a palette, not the whole variable set: surfaces, borders and
> the table-of-contents card are derived from it by `default.css`. Load the
> defaults alongside it. Do **not** pair a preset with `noDefault: true`: those
> derived tokens fall back to the light palette.

Each theme declares itself, so a picker can be built from data:

```ts
import { themes } from '@jaamd/astro/themes'
// [{ slug: "dracula", name: "Dracula", mode: "dark", shiki: "dracula" }, …]
```

Each preset is generated from a `palette.js` of fourteen colours, so every theme
declares the same token set. The `.css` files are build output: to customise a
preset, copy its directory and edit the palette. To add one, see
[CONTRIBUTING.md](https://github.com/jaamd/jaamd/blob/main/CONTRIBUTING.md#themes).

## Dual-theme Shiki

Pass an object to `theme` to highlight code with two colour schemes, switched by
the `dark` class:

```ts
jaamd({
    theme: { light: 'github-light', dark: 'github-dark' },
})
```

Add an inline script in `<head>` to prevent a flash of the wrong theme:

```html
<script is:inline>
    ;(function () {
        var t = localStorage.getItem('theme')
        if (t === 'dark' || (!t && matchMedia('(prefers-color-scheme: dark)').matches))
            document.documentElement.classList.add('dark')
    })()
</script>
```
