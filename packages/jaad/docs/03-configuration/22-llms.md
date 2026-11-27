---
description: Turn off the files JAAD writes for language models.
---

# `llms`

Writes `llms.txt` and `llms-full.txt`, and announces each page's Markdown in
its head. See [LLMs and agents](../02-guides/07-llms.md) for what they hold.

| Type      | Default |
| --------- | ------- |
| `boolean` | `true`  |

## Use cases

### Docs that are not for agents

```ts
llms: false,
```

`llms.txt`, `llms-full.txt` and the announcement are left out. The Markdown of
each page stays, for the "Copy page" button.
