---
description: The footer of every page, as HTML.
---

# `footer`

The footer, as a line of HTML.

| Type              | Default     | Notes                          |
| ----------------- | ----------- | ------------------------------ |
| `string \| false` | `":credit"` | Site option, JAAB reads it too |

Two placeholders take the place of a link:

- `:credit` is the "Built with JAAD" credit;
- `:feed` is the link to the site's feed, when a package such as
  [JAAB](https://docs.jaamd.org/jaab) writes one.

Unset, the footer is the credit, followed by the feed link when there is one.

## Use cases

### A licence and a credit

```ts
footer: '© 2026 Me · MIT License · :credit',
```

### Links of your own

```ts
footer: '<a href="https://example.dev/privacy">Privacy</a> · :feed · :credit',
```

### No footer

```ts
footer: false,
```
