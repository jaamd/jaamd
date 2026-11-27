---
description: Light, dark, or the reader's choice.
---

# `appearance`

Whether the site follows the reader's system, with a switcher, or stays light
or dark.

| Type                          | Default  | Notes                          |
| ----------------------------- | -------- | ------------------------------ |
| `"auto" \| "light" \| "dark"` | `"auto"` | Site option, JAAB reads it too |

## Use cases

### The reader's choice

Leave it unset: the site follows the system's preference, and the switcher in
the header keeps the reader's choice.

### A dark site

```ts
theme: 'tokyo-night',
appearance: 'dark',
```

`"light"` and `"dark"` remove the switcher and its script.
