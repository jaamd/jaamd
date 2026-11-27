---
description: An image shown in place of the site name in the header.
---

# `logo`

An image that takes the place of the site name in the header. The name stays
as its alternative text.

| Type     | Default | Notes                          |
| -------- | ------- | ------------------------------ |
| `string` | none    | Site option, JAAB reads it too |

## Use cases

### A logo in `public/`

```ts
logo: '/logo.svg',
```

A path gets Astro's [`base`](08-base.md), so it keeps working below a subpath.

### A logo served elsewhere

```ts
logo: 'https://cdn.example.dev/logo.svg',
```

### A taller logo

The header keeps its height: raise `--site-header-height` in `src/jaamd.css`.
See [Styles](../02-guides/04-styles.md#layout-tokens).

## Limits

A path to a source file, such as `./src/logo.svg`, stops the build: the logo
is a public path, `/logo.svg`, or an `http(s)` URL.
