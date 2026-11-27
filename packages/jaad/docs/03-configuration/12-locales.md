---
description: Override the language directories JAAD detects.
---

# `locales`

The language directories, when detection guesses wrong. JAAD finds them on its
own: see [Languages](../02-guides/01-languages.md).

| Type                | Default  |
| ------------------- | -------- |
| `string[] \| false` | detected |

## Use cases

### Pinning the languages

```ts
locales: ['en', 'it'],
```

### Directories that look like languages

A chapter named `it/` or `ar/` on a site in one language would be read as a
language when there are two of them. Turn detection off:

```ts
locales: false,
```
