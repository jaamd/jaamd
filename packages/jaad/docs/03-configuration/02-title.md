---
description: The site name, in the header, the browser title and the metadata.
---

# `title`

The name of the site. It is the only option JAAD requires.

| Type     | Default  | Notes                          |
| -------- | -------- | ------------------------------ |
| `string` | required | Site option, JAAB reads it too |

## Use cases

### Naming the site

```ts
defineJaadConfig({
    title: 'My Project',
})
```

The header shows it, unless a [`logo`](05-logo.md) takes its place. Every
browser title ends with it, as `Setup | My Project`, and the opening page's is
the title alone. It also names the site in the social metadata and in
`llms.txt`.
