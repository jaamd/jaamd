---
description: One documentation site per language, from locale directories under docs/.
keywords: [i18n, locales, translation, hreflang]
---

# Languages

Name the directories directly under `docs/` after language codes and JAAD
builds one documentation site per language, with a switcher in the header.

```
docs/
  en/
    01-introduction.md      → /
    02-guides/
      01-setup.md           → /guides/setup
  it/
    01-introduzione.md      → /it
    02-guide/
      01-installazione.md   → /it/guide/installazione
```

Nothing needs configuring. With one language, or with no locale directory at
all, nothing changes.

## Detection

A directory is a locale when its name is an ISO 639-1 language, optionally with
a script and a region: `it`, `pt-BR`, `zh-Hans`. A three-letter directory such
as `api` is never a locale.

**Two directories make the tree localised.** A single one counts only when
`lang` names it: `docs/en/` with `lang: "en"` is a first language about to be
translated, while a lone `docs/it/` on an English site stays a chapter.

A locale directory with no Markdown in it is dropped, and its URLs keep their
shape.

Once the tree is localised, every entry under `docs/` has to be a locale
directory. A stray one stops the build and is named:

```
jaad: mixed documentation tree
  docs/guides is not a locale, but en, it are
Move every page under a locale directory, or set locales: false.
```

The nesting limit applies inside each language, not to the tree as a whole:
`it/guides/setup.md` is a chapter inside Italian, and still only one level.

## The default language

`lang` names the language that keeps the unprefixed URLs:

```ts
defineJaadConfig({ title: 'My Project', lang: 'en' })
```

`/guide` is English and `/it/guide` is Italian, so adding a second language
changes none of the URLs. `lang` must match one of the directories. See
[`lang`](../03-configuration/04-lang.md), and [`locales`](../03-configuration/12-locales.md)
for when detection guesses wrong.

## Pairing translations

Two pages are translations of each other when their slugs match:
`en/guides/setup.md` and `it/guides/setup.md` both resolve to `guides/setup`.
That is the whole rule, and it is why nothing pairs when a language translates
its own file and directory names.

To translate the URLs too, give both files the same `translationKey`:

```markdown
---
translationKey: setup
---
```

```
docs/en/02-handbook/01-setup.md        → /handbook/setup
docs/it/02-guida/01-installazione.md   → /it/guida/installazione
```

With the key the two link to each other in the switcher and in `hreflang`;
without it neither would know the other existed. Two pages of one language
claiming the same key stop the build.

## Untranslated pages

Each language has exactly the pages in its own directory. There is no fallback:
a page that exists only in English is not built under `/it`, does not appear in
the Italian sidebar, and is not in the Italian search index or `llms.txt`.

The switcher accounts for this. On a page with no counterpart in a language, it
links to that language's opening page rather than to a URL that would 404.

## The switcher

It sits next to the theme switcher, with the current language's flag and code,
and each language's own name in the menu. The flag comes from the region, as in
`pt-BR`, or else from the language's usual one; a language with none shows its
code alone.

## Metadata

| Tag                      | Value                                   |
| ------------------------ | --------------------------------------- |
| `<html lang>`            | The page's language                     |
| `og:locale`              | The page's language                     |
| `og:locale:alternate`    | Every language that has this page       |
| `<link rel="alternate">` | `hreflang` per translation, `x-default` |

`hreflang` links need [`site`](../03-configuration/07-site.md). The
[frontmatter](../01-getting-started/03-frontmatter.md) is per file, so it is
written in the file's language. Each language has its own search index and
`llms.txt`, as `/it/llms.txt`.

## The interface

JAAD's interface follows each page's language. For the languages it has, and
to change its strings, see [`ui`](../03-configuration/26-ui.md).
