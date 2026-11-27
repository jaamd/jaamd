---
description: The language of the site, or its default language when it has several.
---

# `lang`

The language of the pages, as a language tag.

| Type     | Default | Notes                          |
| -------- | ------- | ------------------------------ |
| `string` | `"en"`  | Site option, JAAB reads it too |

## Use cases

### Documentation in one language

```ts
lang: 'it',
```

It is the `lang` of every page, the locale of the metadata, and the language
of the interface: see [`ui`](26-ui.md) for the languages JAAD has its strings
in.

### The default of several languages

With one directory per language under `docs/`, `lang` names the one served
without a prefix: with `lang: 'en'`, `/guide/` is English and `/it/guide/`
Italian. A single language directory counts as a language only when `lang`
names it. See [Languages](../02-guides/01-languages.md).

## Limits

- A tag, as `pt-BR`; `pt_BR` stops the build.
- On a site with several languages, it has to be one of their directories.
