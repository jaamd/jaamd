---
description: The site description, for the metadata and llms.txt.
---

# `description`

What the site is about, in a sentence.

| Type     | Default                         | Notes                          |
| -------- | ------------------------------- | ------------------------------ |
| `string` | `description` of `package.json` | Site option, JAAB reads it too |

## Use cases

### Describing the site

```ts
description: 'The command line and SDK of Acme, with guides and a reference.',
```

It is the description metadata of a page that has none of its own in its
[frontmatter](../01-getting-started/03-frontmatter.md#metadata) and no first
paragraph to take it from, and the line under the title of `llms.txt`.

### A package that already describes itself

Leave it unset: the `description` of `package.json` is read in its place.
