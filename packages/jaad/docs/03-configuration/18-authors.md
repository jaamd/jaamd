---
description: The people who write the site, for the pages to name by key.
---

# `authors`

The people who write the site, by key. A page names them in its
[frontmatter](../01-getting-started/03-frontmatter.md#authors).

| Type                                             | Default | Notes                          |
| ------------------------------------------------ | ------- | ------------------------------ |
| `Record<string, { name: string; url?: string }>` | `{}`    | Site option, JAAB reads it too |

## Use cases

### The same people on many pages

```ts
authors: {
    ada: { name: 'Ada Lovelace', url: 'https://example.dev/ada' },
    grace: { name: 'Grace Hopper' },
},
```

A page writes `authors: [ada, grace]`. Each name with a `url` is a link, and
the `url` also reaches the page's metadata.

### Docs and a blog

In `site.config.ts`, the map is shared: a post of [JAAB](https://docs.jaamd.org/jaab)
and a page of the docs name the same people by the same keys.

### Authors that are not in the map

A page can name anyone without the map: a string that is not a key is a name,
as `authors: Grace Hopper`.
