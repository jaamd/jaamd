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
lead to other pages' Markdown, its local images to the files the build wrote,
and code tabs, tables of contents and spoilers
become plain Markdown. A tool that read the `.md` as the page's source file
should read the file in the repository instead.

### New files for language models

The build also writes `llms-full.txt`, and each page announces its Markdown in
its head. With `routeBase` below the root, `llms.txt` and `llms-full.txt` are
also written at the site root. `llms: false` turns all of these off; see
[LLMs and agents](02-guides/07-llms.md).

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
- The table of contents and the page actions: `.site-toc`, `.site-page-action`
  and the rest, each beside its `docs-*` class until 2.0. The table of
  contents' id is now `site-toc`, where it was `docs-toc`.
- Layout tokens: `--site-chrome-width` and the rest. The `--jaad-*` names are
  still read until 2.0.
- Custom elements: `<jaad-search>`, `<jaad-nav-mobile>`, `<jaad-theme-toggle>`
  and `<jaad-locale-switcher>` are now `<site-search>`, `<site-nav-mobile>`,
  `<site-theme-toggle>` and `<site-locale-switcher>`. CSS or scripts that
  select them by tag need the new names.

Pages on `Page` load only the shell's stylesheet, without the documentation's.

### The project stylesheet

`src/jaad.css` is now `src/jaamd.css`, the name every package of a site reads.
Rename the file; `src/jaad.css` is still read until 2.0, and a project with
both stops the build.

### Authors

`authors` in the frontmatter names who wrote a page, by key of the new site
option `authors`, by name, or with a url, and the names are shown above the
title. `author: Ada Lovelace` still works, and now shows the name too. A page
that sets neither shows nothing, unless the new docs option `author` names a
default. A page with several authors has one `<meta name="author">` for each,
where 1.1 joined them with commas. See [Authors](01-getting-started/03-frontmatter.md#authors).

### Reading time

[`readingTime: true`](03-configuration/13-readingTime.md) shows the minutes to read a page above its title. It is off
by default, so a 1.1 site looks the same.

### Drafts

`draft` is no longer read: a page with `draft: true` is published like the
others, in development and in the build, and links to it no longer warn. Keep
a page that is not ready outside the docs, or on a branch.

### The scaffolder

The scaffolder is now `npm create @jaamd`: it creates docs, a blog with
[JAAB](https://docs.jaamd.org/jaab), or both, and needs `--template` when it
runs without a terminal. `npm create @jaamd/jaad` still works, with the same
templates and options, for the scripts that run it; it will be retired in 2.0.
Both now ask for the template before the directory.

## From 1.0

### Node 22.23.4

JAAD requires Node 22.23.4 or later.

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

## From 0.x

Upgrade to 1.1 first, following
[its guide](https://github.com/jaamd/jaamd/blob/v1.1.0/packages/jaad/docs/03-upgrading.md),
then apply the changes above.
