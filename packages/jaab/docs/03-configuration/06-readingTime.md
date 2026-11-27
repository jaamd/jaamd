---
description: The minutes it takes to read a post, beside its date.
---

# `readingTime`

Shows the minutes it takes to read each post, beside its date, at 200 words a
minute.

| Type      | Default |
| --------- | ------- |
| `boolean` | `true`  |

## Use cases

### Short posts

Leave it out where every post reads in a minute or two:

```ts
readingTime: false,
```

A [layout of your own](10-layout.md) gets the minutes whether the option is on
or off.
