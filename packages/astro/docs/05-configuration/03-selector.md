---
description: The elements the client script enhances.
---

# `selector`

The elements the [client script](../03-usage/02-client.md) enhances: copy
buttons, code tabs, the lightbox and the rest. The stylesheet always targets
`.jaamd-content`, whatever the selector.

| Type     | Default            |
| -------- | ------------------ |
| `string` | `".jaamd-content"` |

## Use cases

### Content wrapped in `<MarkdownContent>`

Leave it unset: the component carries `.jaamd-content`.

### A wrapper of your own

```ts
jaamd({ selector: '[data-md]' })
```

The script enhances `<div data-md>`; the styles are yours to supply.
