---
description: The default values of the CSS variables, on every page.
---

# `defaultVariables`

Adds `default.css`, the default `--jaamd-*` values, to every page. They sit in
`@layer jaamd.defaults`, so your own values and the theme presets win over them
either way.

| Type      | Default |
| --------- | ------- |
| `boolean` | `true`  |

## Use cases

### Every variable set by you

```ts
jaamd({ defaultVariables: false })
```

`<MarkdownContent>` still imports the defaults, so its pages keep them. With a
wrapper of your own, import `@jaamd/astro/default.css` where you want them.
