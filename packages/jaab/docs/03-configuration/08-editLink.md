---
description: The link to edit a post, from the repository or a URL of yours.
---

# `editLink`

A link to edit the post, at its end.

| Type                | Default |
| ------------------- | ------- |
| `boolean \| string` | `true`  |

It works as JAAD's [`editLink`](../../../jaad/docs/03-configuration/17-editLink.md):
found from the git remote and the branch, set with a URL where `:path` is the
post's path inside `blogDir`, or removed.

## Use cases

### Another forge

```ts
editLink: 'https://git.example.dev/me/blog/edit/main/blog/:path',
```

### No link

```ts
editLink: false,
```
