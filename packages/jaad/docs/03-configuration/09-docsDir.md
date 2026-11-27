---
description: The directory the documentation pages are read from.
---

# `docsDir`

The directory of the Markdown pages, from the project root.

| Type     | Default    |
| -------- | ---------- |
| `string` | `"./docs"` |

## Use cases

### Pages in another directory

```ts
docsDir: './content',
```

### Pages beside sections

With [`sections`](11-sections.md), `docsDir` is read only when set: its pages
come before every section, and the first one opens the docs.
