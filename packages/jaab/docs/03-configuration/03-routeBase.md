---
description: The path the blog is served at.
---

# `routeBase`

Where the blog is mounted, inside the site: its index, its pages and its feed.

| Type     | Default |
| -------- | ------- |
| `string` | `"/"`   |

## Use cases

### Docs at `/`, the blog at `/blog`

```ts
jaab({ ...site, routeBase: '/blog' }),
```

The index is at `/blog/`, a post at `/blog/introducing-jaab/` and the feed at
`/blog/rss.xml`. See [Docs and a blog](../01-getting-started/01-installation.md#docs-and-a-blog).

### A site with a landing page of its own

Move the blog below the root, and keep `src/pages/index.astro`.

## Limits

The blog's index takes its base: a page of yours there, as
`src/pages/index.astro` with the blog at `/`, stops the build. So does another
package on the same route.
