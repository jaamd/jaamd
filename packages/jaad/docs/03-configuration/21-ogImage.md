---
description: The image of the social cards of the site.
---

# `ogImage`

The image shown when a page is shared, in its Open Graph tags and its
structured data.

| Type              | Default             | Notes                          |
| ----------------- | ------------------- | ------------------------------ |
| `string \| false` | `public/og-image.*` | Site option, JAAB reads it too |

## Use cases

### The usual file

Leave it unset and add `public/og-image.png`: JAAD takes the first of
`og-image.png`, `.jpg`, `.jpeg` or `.webp`.

### Another image

```ts
ogImage: '/social/card.png',
```

A page can set an image of its own in its
[frontmatter](../01-getting-started/03-frontmatter.md#metadata).

### No image

```ts
ogImage: false,
```

## Limits

A local image needs [`site`](07-site.md): a social card takes absolute URLs.
An `http(s)` URL needs nothing else.
