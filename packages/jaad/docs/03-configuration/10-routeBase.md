---
description: The path the documentation is served at.
---

# `routeBase`

Where the documentation is mounted, inside the site.

| Type     | Default |
| -------- | ------- |
| `string` | `"/"`   |

## Use cases

### A landing page at `/`, the docs at `/docs`

```ts
routeBase: '/docs',
```

The site's own `src/pages/index.astro` keeps the root. The `site` template of
`npm create @jaamd` sets it up that way: see
[Custom pages](../02-guides/05-custom-pages.md).

### Docs and a blog

Beside [JAAB](https://docs.jaamd.org/jaab), each package takes a base of its
own: the docs at `/` and the blog at `/blog`, for example. Two packages on the
same route stop the build.

## Limits

A page of yours on a route of the docs, as `src/pages/docs/[...slug].astro`
with `routeBase: '/docs'`, stops the build. An `index` page over docs at the
root only warns: the page takes the root.
