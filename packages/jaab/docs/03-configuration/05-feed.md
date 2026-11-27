---
description: The RSS feed of the blog, and how many posts it carries.
---

# `feed`

Writes `rss.xml`, an RSS 2.0 feed with the newest posts in full. See
[Feed and metadata](../02-guides/01-feed.md) for what it holds.

| Type                           | Default |
| ------------------------------ | ------- |
| `boolean \| { limit: number }` | `true`  |

The feed needs [`site`](../../../jaad/docs/03-configuration/07-site.md): without
it, the build warns and writes none.

## Use cases

### The last 20 posts

Leave it unset.

### More posts, or fewer

```ts
feed: { limit: 50 },
```

### No feed

```ts
feed: false,
```

The header and the footer then have no feed link.
