---
description: Split the documentation into parts, each from a directory of its own.
---

# `sections`

Splits the documentation into parts, each read from its own directory, with
its own chapters and its own group in the sidebar.

| Type                                              | Default |
| ------------------------------------------------- | ------- |
| `Record<string, { dir: string; label?: string }>` | none    |

```ts
defineJaadConfig({
    title: 'My Project',
    sections: {
        guide: { dir: './docs/guide', label: 'Guide' },
        api: { dir: '../packages/api/docs' },
    },
})
```

- The key is the URL segment, in lowercase letters, digits and dashes:
  `api/01-client.md` is served at `/api/client/`.
- `label` names the section in the sidebar and in its pages' browser titles.
  It defaults to the key, title-cased: `api` becomes `Api`.
- Sections follow the order they are declared in, and the previous and next
  links run on from one into the next.
- The first page of the first section opens the docs at
  [`routeBase`](10-routeBase.md); the first page of each other section opens
  at the section's URL.

Inside each section, the [rules of the file tree](../01-getting-started/02-pages.md)
apply as they do in `docs/`.

## Use cases

### A monorepo with one docs folder per package

Each package keeps its documentation beside its code, and the site reads them
from there:

```ts
sections: {
    cli: { dir: '../packages/cli/docs', label: 'CLI' },
    sdk: { dir: '../packages/sdk/docs', label: 'SDK' },
},
```

This site is built that way, with one section for each package.

### Pages that belong to no section

Set [`docsDir`](09-docsDir.md) as well: its pages come before every section,
outside them, and the first one opens the docs. Without `docsDir` set,
`./docs` is not read.

```ts
docsDir: './content',
sections: {
    jaamd: { dir: '../packages/astro/docs' },
    jaad: { dir: '../packages/jaad/docs' },
},
```

### Sections in more than one language

Every section holds the same language directories, `en/` and `it/` in each.
See [Languages](../02-guides/01-languages.md).

## Limits

- No section's directory can be inside another's, or inside `docsDir`.
- [`editLink`](17-editLink.md) links each page to its own section's directory.
