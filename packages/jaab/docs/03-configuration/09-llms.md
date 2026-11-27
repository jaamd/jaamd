---
description: Turn off the files JAAB writes for language models.
---

# `llms`

Writes `llms.txt`, `llms-full.txt` and the Markdown of each post, at its
address plus `.md`.

| Type      | Default |
| --------- | ------- |
| `boolean` | `true`  |

## Use cases

### A blog that is not for agents

```ts
llms: false,
```

The files are left out, the Markdown of each post included.
