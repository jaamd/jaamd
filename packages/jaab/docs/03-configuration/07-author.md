---
description: The author of every post that names none.
---

# `author`

The key in the site's [`authors`](../../../jaad/docs/03-configuration/18-authors.md)
of the author of every post that names none.

| Type     | Default |
| -------- | ------- |
| `string` | none    |

## Use cases

### A blog with one writer

```ts
authors: {
    ada: { name: 'Ada Lovelace', url: 'https://example.dev/ada' },
},
author: 'ada',
```

Every post is by Ada Lovelace unless its frontmatter names someone else; a post with
`authors: []` names nobody.

## Limits

It has to be a key of `authors`, or the build stops.
