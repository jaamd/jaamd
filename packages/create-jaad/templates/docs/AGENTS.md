# Repository guide

The documentation here is built with [JAAD](https://docs.jaamd.org/jaad), an
Astro integration that turns the `docs/` folder into a site. There are no page
components to write: a markdown file in `docs/` is a page.

## Development

Start the dev server in background mode:

```
astro dev --background
```

Manage it with `astro dev stop`, `astro dev status` and `astro dev logs`.
Build the site with `astro build`.

## Layout

| Path                    | What it is                                      |
| ----------------------- | ----------------------------------------------- |
| `docs/`                 | The markdown that becomes the site              |
| `jaad.config.ts`        | Every JAAD option                               |
| `src/jaad.css`          | Colours, fonts and widths (create it if absent) |
| `astro.config.mjs`      | Re-exports JAAD's Astro config; leave it alone  |
| `src/content.config.ts` | Re-exports JAAD's collection; leave it alone    |

JAAD's own stylesheet is precompiled: installing it does not bring Tailwind
into this project.

`src/pages/` is for pages of your own, which keep their own layout.

## Writing pages

- A numeric prefix sets the order and is stripped from the URL:
  `02-guide.md` becomes `/guide`.
- A folder becomes a chapter. Only one level of nesting is supported,
  per language.
- Link to another page by its file, relative to the one you are writing:
  `[Setup](./02-guides/01-setup.md)`. JAAD turns it into the page's URL.
- The first `# Heading` is the page title; `##` and `###` build the table of
  contents.
- The first page in sort order opens at `/`, and its named URL redirects there.
- Removing the prefixes must leave every page with a unique path, or the build
  stops and names the conflicting files.

Frontmatter is optional, and each field overrides something the file tree or
the body already supplies:

```markdown
---
title: Images & Videos # page title; the filename still sets the URL
label: Media # shorter name, in navigation only
translationKey: media # pairs this page with its translations
description: Add accessible images. # description metadata
keywords: [markdown, media] # keyword metadata and search weight
author: Ada Lovelace # author metadata
ogImage: /og/media.png # social image for this page
lastUpdated: 2026-09-12 # modification date in metadata
order: 5 # replaces the number in the filename
draft: false # true keeps it out of the build
---
```

## More than one language

Name the directories directly under `docs/` after language codes — `docs/en/`,
`docs/it/` — and JAAD builds one site per language with a switcher in the
header. `lang` in `jaad.config.ts` names the one that keeps the unprefixed
urls. Two directories are the threshold; a single one counts only when `lang`
names it.

## Changing the site

Title, logo, navigation, social links, footer and theme are options in
`jaad.config.ts`. Colours, fonts and layout widths are CSS custom properties
in `src/jaad.css`. Reach for a custom `src/jaad/DocsFrame.astro` only when the
structure itself has to change.

## Documentation

The JAAD documentation is installed with it, in `node_modules/@jaamd/jaad/docs/`. Read the
guide for a task before working on it:

- Pages, links and sections: `node_modules/@jaamd/jaad/docs/01-getting-started/02-pages.md`
- Frontmatter: `node_modules/@jaamd/jaad/docs/02-configurations/02-frontmatter.md`
- Markdown syntax: https://docs.jaamd.org/jaamd/markdown.md
- Languages: `node_modules/@jaamd/jaad/docs/02-configurations/03-i18n.md`
- Search: `node_modules/@jaamd/jaad/docs/02-configurations/04-search.md`
- Configuration reference: `node_modules/@jaamd/jaad/docs/02-configurations/01-reference.md`
- Styles and fonts: `node_modules/@jaamd/jaad/docs/02-configurations/06-styles.md`
- Themes: `node_modules/@jaamd/jaad/docs/02-configurations/05-themes.md`
- Pages of your own: `node_modules/@jaamd/jaad/docs/02-configurations/07-custom-pages.md`
- Advanced layout: `node_modules/@jaamd/jaad/docs/02-configurations/08-advanced-layout.md`
- Deployment: `node_modules/@jaamd/jaad/docs/01-getting-started/03-deployment.md`

The same pages are published at https://docs.jaamd.org/jaad.
