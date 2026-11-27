---
description: How to upgrade JAAD, and the changes that need action, by the version you upgrade from.
---

# Upgrading

JAAD is usually upgraded together with Astro: each JAAD release targets one Astro
major, and most releases follow an Astro release. Upgrade both at once:

:::code-tabs

```bash npm
npx @astrojs/upgrade
```

```bash pnpm
pnpm dlx @astrojs/upgrade
```

```bash yarn
yarn dlx @astrojs/upgrade
```

```bash bun
bunx @astrojs/upgrade
```

:::

To upgrade JAAD alone:

:::code-tabs

```bash npm
npm install @jaamd/jaad@latest
```

```bash pnpm
pnpm add @jaamd/jaad@latest
```

```bash yarn
yarn add @jaamd/jaad@latest
```

```bash bun
bun add @jaamd/jaad@latest
```

:::

Then run a build and read below the changes since the version you upgrade from.

## From 1.1

### The Markdown of each page

The `.md` of a page is now written to read on its own, not served as its
source: it opens with the title and the frontmatter description, its links
lead to other pages' Markdown, and code tabs, tables of contents and spoilers
become plain Markdown. A tool that read the `.md` as the page's source file
should read the file in the repository instead.

### New files for language models

The build also writes `llms-full.txt`, and each page announces its Markdown in
its head. With `routeBase` below the root, `llms.txt` and `llms-full.txt` are
also written at the site root. `llms: false` turns all of these off; see
[LLMs and agents](02-configurations/09-llms.md).

### Pages that take a documentation route

A page in `src/pages/` on a route JAAD serves, such as
`src/pages/docs/search-index.json.ts` or `src/pages/docs/[...slug].astro` with
`routeBase: "/docs"`, now stops the build instead of replacing JAAD's in
silence. Rename the page, or move the documentation with `routeBase`. An
`index` page over documentation at the root still only warns.

### Shell names

The header, the footer, the search and the other parts of the shell are named
`site-*`, as they now serve every package of a site:

- Classes: `.site-header`, `.site-chrome`, `.site-main` and the rest. Each
  element still carries its `jaad-*` class, so CSS written for 1.1 keeps
  working until 2.0.
- Layout tokens: `--site-chrome-width` and the rest. The `--jaad-*` names are
  still read until 2.0.
- Custom elements: `<jaad-search>`, `<jaad-nav-mobile>`, `<jaad-theme-toggle>`
  and `<jaad-locale-switcher>` are now `<site-search>`, `<site-nav-mobile>`,
  `<site-theme-toggle>` and `<site-locale-switcher>`. CSS or scripts that
  select them by tag need the new names.

Pages on `Page` load only the shell's stylesheet, without the documentation's.

### Authors

`authors` in the frontmatter names who wrote a page, by key of the new site
option `authors`, by name, or with a url, and the names are shown above the
title. `author: Ada Lovelace` still works, and now shows the name too. A page
that sets neither shows nothing, unless the new docs option `author` names a
default. A page with several authors has one `<meta name="author">` for each,
where 1.1 joined them with commas. See [Authors](02-configurations/02-frontmatter.md#authors).

### The scaffolder

The scaffolder is now `npm create @jaamd`: it creates docs, a blog with
[JAAB](https://docs.jaamd.org/jaab), or both, and needs `--template` when it
runs without a terminal. `npm create @jaamd/jaad` still works, with the same
templates and options, for the scripts that run it; it will be retired in 2.0.
Both now ask for the template before the directory.

## From 1.0

### Node 22.23.4

JAAD requires Node 22.23.4 or later, the minimum of Astro 7.4.

### Page URLs follow Astro's

Links between pages, the canonical URL, the alternates and the sitemap now
agree with Astro's `trailingSlash` and `build.format`. With Astro's defaults,
every page URL ends with `/`; with `trailingSlash: "never"` or
`build.format: "file"`, none does. Links written by file need no change. A URL
written by hand to a page, as in `nav`, is served either way, and with the
matching slash saves a redirect on most hosts.

### Stricter options

- An unknown key inside an option, such as `head[].attributes`, is an error,
  as an unknown top-level option already was.
- `ui` takes locale codes, and only the interface strings JAAD has.
- `lang` must be a language tag: `en-US`, not `en_US`.
- `homeLink`, `nav` and `social` links must be paths or `http(s)`, `mailto` or
  `tel` URLs. `logo` and `ogImage` must be root-relative paths or `http(s)`
  URLs; `//host/...` is neither.

### Edit links

"Edit this page" opens the forge's own editor, the GitLab, Gitea, Forgejo and
Bitbucket ones included, on the page's real file name. On a detached checkout
where no CI names the branch, the link is left out instead of pointing at
`HEAD`.

### Paths and site from Astro

`public/` and `src/` are read where Astro's `publicDir` and `srcDir` point. A
`site` set in Astro's config, and not in `jaad.config.ts`, now also produces the
sitemap.

## From 0.10 and 0.11

### The package is now @jaamd/jaad

`@lancher-dev/jaad` is now `@jaamd/jaad`, and `@lancher-dev/create-jaad` is
`@jaamd/create-jaad`. The old packages are deprecated and receive no further
releases. `@jaamd/jaad` 0.11 was 0.10 under the new scope: from it, skip to
the next heading.

:::code-tabs

```bash npm
npm uninstall @lancher-dev/jaad
npm install @jaamd/jaad
```

```bash pnpm
pnpm remove @lancher-dev/jaad
pnpm add @jaamd/jaad
```

```bash yarn
yarn remove @lancher-dev/jaad
yarn add @jaamd/jaad
```

```bash bun
bun remove @lancher-dev/jaad
bun add @jaamd/jaad
```

:::

Then replace `@lancher-dev/jaad` with `@jaamd/jaad` in every import:
`astro.config.*`, `src/content.config.*`, `jaad.config.ts`, and any page using
`@jaamd/jaad/layouts/Page.astro` or `@jaamd/jaad/advanced`.

The documentation moved from `jaad.lancher.dev` to `docs.jaamd.org/jaad`: update
the links in `AGENTS.md` if `create-jaad` generated one.

### JAAMD is now @jaamd/astro

JAAD installs it for you: a site that only uses `@jaamd/jaad` has nothing to do.
A project that imports `@lancher-dev/jaamd` or `@jaamd/jaamd` directly follows
[JAAMD's upgrade guide](../../astro/docs/06-upgrading.md#from-011).

### Page titles name their section

With [sections](01-getting-started/02-pages.md#sections), the browser title of
a page is `Page · Section | Site`, so pages with the same name in two sections
no longer share a title. Docs without sections are unchanged.

### A fixed shell

The header and both sidebars are fixed to the window and only the page
scrolls. They sit in one column, `--jaad-chrome-width`, which now defaults to
the sidebars, the page and their gaps; to fit the documentation to a site of
your own, set it. See [Layout tokens](02-configurations/06-styles.md#layout-tokens).

- The sidebar lists every section with all its pages, under the section's name.
- Above the title, the page shows its section and chapter instead of a full
  breadcrumb trail.
- Copy and edit sit under the table of contents, in the right column.
- Previous and next are a line of text, and the footer closes the page column.
- On narrow screens, a menu named after the current page opens the navigation,
  and another opens the table of contents. The scroll-to-top button is gone.

`--jaad-sidebar-offset` and the `.docs-main-gutters` class are gone: set
`--jaad-chrome-width` and `--jaad-sidebar-width` instead. The `ui` keys
`breadcrumb.root`, `nav.jumpToSection`, `nav.selectPage` and `scrollTop` are no
longer used: remove them from your overrides.

### Custom docs frame: renamed navigation types

"Section" now names a part of the documentation with its own directory. A
`src/jaad/DocsFrame.astro` that reads the navigation follows these renames:

| Before                          | After               |
| ------------------------------- | ------------------- |
| `navigation.sections`           | `navigation.groups` |
| `NavSection`                    | `DocsNavGroup`      |
| `DocsHeadings`                  | `DocsHeading`       |
| `order` on a group              | removed             |
| `primaryOrder` on `DocsNavItem` | removed             |

Groups and items arrive in display order, so nothing replaces the two removed
fields.

`DocsEntry` is no longer exported: no prop of the frame carried it. The page a
frame renders is `DocsFrameProps['page']`.

### Search index

`search-index.json` now holds one entry per heading, for
[search by heading](02-configurations/04-search.md). Its format is described in
[The index format](02-configurations/04-search.md#the-index-format).

### Fewer exports

`@jaamd/jaad` exports `jaad()`, `defineJaadConfig()` and the `JaadUserConfig`
type. `defineJaadSite`, `JaadConfig` and `JaadResolvedConfig` are gone:
`@jaamd/jaad/site` builds the Astro configuration, and the resolved
configuration, `virtual:jaad/config` included, is internal.

## From 0.9 and earlier

Apply these, then the changes [from 0.10 and 0.11](#from-010-and-011):

- **Tailwind on your own pages**: replace `@tailwindcss/vite` in
  `astro.vite.plugins` with `tailwind: true`, and remove the CSS that imports
  `tailwindcss` for pages on `Page`. Utilities read JAAD's tokens
  (`bg-surface`, `text-primary`). Pages on a layout of your own keep their
  `@import "tailwindcss";`. See [Styles](02-configurations/06-styles.md#tailwind).
- **Component classes**: CSS that targeted Tailwind utilities in JAAD's markup
  needs the new names:

    | Before                           | Now                                   |
    | -------------------------------- | ------------------------------------- |
    | `body` utilities                 | `.jaad-body`                          |
    | default frame wrapper `contents` | `.docs-frame`                         |
    | `.theme-icon-to-dark` / `-light` | `.jaad-theme-icon-to-dark` / `-light` |
    | active ToC link class            | `[aria-current="location"]`           |

    Your own pages that used utilities such as `.hidden` without Tailwind need
    `tailwind: true` or CSS of their own.

- **From 0.7**: import `@jaamd/jaad/layouts/Page.astro` instead of
  `@jaamd/jaad/layouts/Base.astro`.
