---
description: The author of every page that names none.
---

# `author`

The key in [`authors`](18-authors.md) of the author of every page that names
none.

| Type     | Default |
| -------- | ------- |
| `string` | none    |

## Use cases

### A site with one writer

```ts
authors: {
    ada: { name: 'Ada Lovelace', url: 'https://example.dev/ada' },
},
author: 'ada',
```

Every page shows Ada Lovelace above its title, unless its frontmatter names
someone else. A page with `authors: []` names nobody, even then.

## Limits

It has to be a key of `authors`, or the build stops.
