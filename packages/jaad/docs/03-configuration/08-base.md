---
description: The path the site is served below, as on GitHub Pages.
---

# `base`

The path below the domain the whole site is served at. It is Astro's own
option, and can be set here or in `astro.config`.

| Type     | Default |
| -------- | ------- |
| `string` | none    |

## Use cases

### A project page on GitHub Pages

```ts
site: 'https://me.github.io',
base: '/my-repo',
```

Every page, asset and link moves below `/my-repo`. Links written by file need
no change, and so do the paths of [`nav`](14-nav.md), [`logo`](05-logo.md) and
[`homeLink`](06-homeLink.md): each gets the base.

### Docs below a path of their own

`base` moves the whole site. To keep a landing page at `/` and the docs at
`/docs`, set [`routeBase`](10-routeBase.md) instead.
