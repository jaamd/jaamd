---
description: The minutes it takes to read a page, above its title.
---

# `readingTime`

Shows the minutes it takes to read each page, above its title and after its
authors, at 200 words a minute.

| Type      | Default |
| --------- | ------- |
| `boolean` | `false` |

## Use cases

### Long guides

```ts
readingTime: true,
```

### A frame of your own

A [frame of your own](../02-guides/06-advanced-layout.md) gets the minutes as
`page.readingTime` whether the option is on or off.
