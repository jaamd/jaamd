---
description: Text links in the header.
---

# `nav`

Text links in the header, in order. On narrow screens they move to the menu.

| Type                                | Default | Notes                          |
| ----------------------------------- | ------- | ------------------------------ |
| `{ label: string; href: string }[]` | `[]`    | Site option, JAAB reads it too |

## Use cases

### Links to the rest of a product

```ts
nav: [
    { label: 'API', href: 'https://api.example.dev' },
    { label: 'Changelog', href: '/changelog/' },
],
```

A link to another site opens in a new tab. A path gets Astro's
[`base`](08-base.md).

### Docs and a blog

Beside [JAAB](https://docs.jaamd.org/jaab), the same links lead from one to the
other:

```ts
nav: [
    { label: 'Docs', href: '/' },
    { label: 'Blog', href: '/blog/' },
],
```

## Limits

`href` is a path or an `http(s)`, `mailto` or `tel` URL.
