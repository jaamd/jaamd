---
description: frontmatterFields(), the frontmatter schema JAAMD sites share.
---

# Frontmatter fields

`frontmatterFields(z)` returns the fields JAAMD sites share, as a plain object
to spread into a content collection schema: `title`, `description`, `draft`,
`keywords`, `author`, `ogImage` and `lastUpdated`.

```ts
// src/content.config.ts
import { frontmatterFields } from '@jaamd/astro/frontmatter'
import { z } from 'astro/zod'

const schema = z.object({
    ...frontmatterFields(z),
    order: z.number().int().optional(),
})
```
