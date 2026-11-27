---
description: Extra tags in the head of every page.
---

# `head`

Tags added to the `<head>` of every page.

| Type                                                  | Default | Notes                          |
| ----------------------------------------------------- | ------- | ------------------------------ |
| `{ tag: string; attrs?: object; content?: string }[]` | `[]`    | Site option, JAAB reads it too |

## Use cases

### Analytics

```ts
head: [{ tag: 'script', attrs: { src: '/analytics.js', defer: true } }],
```

### A verification tag

```ts
head: [{ tag: 'meta', attrs: { name: 'google-site-verification', content: '...' } }],
```

### An inline script

```ts
head: [{ tag: 'script', content: 'window.dataLayer = window.dataLayer || []' }],
```
