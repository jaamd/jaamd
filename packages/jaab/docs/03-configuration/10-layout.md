---
description: Draw the blog's pages with a layout of your own.
---

# `layout`

A layout of the project's own, from its root, that draws every page of the
blog.

| Type     | Default |
| -------- | ------- |
| `string` | none    |

## Use cases

### A blog inside a site with a look of its own

```ts
layout: './src/layouts/BlogLayout.astro',
```

JAAB keeps the posts, the feed and the metadata, and hands each page to the
layout. See [Layout](../02-guides/03-layout.md) for what it gets.
