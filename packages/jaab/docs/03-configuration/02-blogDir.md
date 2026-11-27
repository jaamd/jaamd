---
description: The directory the posts are read from.
---

# `blogDir`

The directory of the posts, from the project root.

| Type     | Default    |
| -------- | ---------- |
| `string` | `"./blog"` |

## Use cases

### Posts in another directory

```ts
blogDir: './posts',
```

`jaab new` does not read the config: pass the directory to it as well, as
`npx jaab new "Hello" --blog-dir posts`.
