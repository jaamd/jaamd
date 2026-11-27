---
description: Where the site name in the header leads.
---

# `homeLink`

Where the site name, or the [`logo`](05-logo.md), leads.

| Type     | Default | Notes                          |
| -------- | ------- | ------------------------------ |
| `string` | `"/"`   | Site option, JAAB reads it too |

## Use cases

### Documentation inside a larger site

Point it at the home of the site the docs belong to:

```ts
homeLink: 'https://example.dev',
```

### Documentation below a landing page

With the docs at `/docs` and a landing page at `/`, the default already leads
to the landing page. To lead to the docs instead:

```ts
homeLink: '/docs/',
```

A path gets Astro's [`base`](08-base.md).
