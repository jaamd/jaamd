---
description: Named themes, a fixed appearance, code themes and custom palettes.
---

# Themes

Dark mode works without configuration: the site follows the reader's system,
and a switcher keeps their choice. A named theme, or a code theme alone, is
one option, [`theme`](../03-configuration/23-theme.md); a site that stays light
or dark is [`appearance`](../03-configuration/24-appearance.md). This page is
for colours of your own.

## Custom themes

Set theme seeds in `src/jaamd.css`:

```css
:root,
html.dark {
    --color-background: #1e1e2e;
    --color-surface: #313244;
    --color-foreground: #cdd6f4;
    --color-foreground-bright: #f5f5f5;
    --color-primary: #89b4fa;
    --color-error: #f38ba8;
    --color-warning: #f9e2af;
    --color-info: #89dceb;
    --color-success: #a6e3a1;
}
```

Use `:root` for light mode and `html.dark` for dark mode. Override individual
`--jaamd-` tokens only when a palette needs values that cannot derive from the
seeds.

## Sharing the theme with your own pages

[Pages of your own](05-custom-pages.md) use your layout, not
JAAD's. Two values keep both halves of a site in step:

| What                      | Value                         |
| ------------------------- | ----------------------------- |
| Class on `<html>` in dark | `dark`                        |
| Stored preference         | `localStorage["theme"]`       |
| Stored values             | `"dark"` / `"light"`          |
| No stored value           | follow `prefers-color-scheme` |

Apply the class in the `<head>`, before anything paints. A browser that blocks
the site's storage throws on `localStorage`; the system's choice then applies:

```astro
<script is:inline>
    ;(function () {
        var t = null
        try {
            t = localStorage.getItem('theme')
        } catch (e) {}
        var dark = t === 'dark' || (!t && matchMedia('(prefers-color-scheme: dark)').matches)
        document.documentElement.classList.toggle('dark', dark)
    })()
</script>
```

Write `"dark"` or `"light"` to that key from your own switcher. JAAD reads it
again on the next documentation page.
