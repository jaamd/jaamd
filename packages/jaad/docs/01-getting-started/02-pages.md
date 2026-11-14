---
description: How the files in docs/ become pages, chapters, sections and URLs.
---

# Pages and structure

Every Markdown file in `docs/` is a page. Its place in the folder sets its URL
and its place in the navigation; nothing else needs configuring.

```
docs/
  01-introduction.md     → /
  02-guides/             → sidebar chapter "Guides"
    01-setup.md          → /guides/setup
    02-deployment.md     → /guides/deployment
  03-reference.md        → /reference
```

The same tree builds the sidebar, the mobile selectors, the breadcrumbs and the
previous and next links.

## Rules

- A numeric prefix sets the order and is removed from the URL. Files without
  one sort after the numbered files.
- A folder becomes a collapsible chapter. Only one folder level is supported.
- The first `# Heading` is the page title.
- The `##` and `###` headings make the page's table of contents. Wrap headings
  in `<div data-toc-ignore>` to leave them out.
- Removing the prefixes must leave every page and chapter with a unique path.

Invalid nesting and duplicate paths stop the build and name the conflicting
files.

## The opening page

The file that sorts first opens the documentation at `routeBase`, which is `/`
by default. Its browser title is the site name alone, and its own slug
redirects to it: with `routeBase: "/docs"`, `01-introduction.md` opens at
`/docs`, and `/docs/introduction` redirects there.

## Linking between pages

Link to another page by its file, relative to the one you are writing:

```markdown
See [Deployment](./02-guides/02-deployment.md#hosting).
```

JAAD turns the link into the page's URL, so it also works on GitHub and in an
editor. A link to a file that does not exist stops the build.

## Sections

A larger site can split its documentation into sections, each with its own
directory, chapters and sidebar group:

```ts
defineJaadConfig({
    title: 'My Project',
    sections: {
        guide: { dir: './docs/guide', label: 'Guide' },
        api: { dir: '../packages/api/docs' },
    },
})
```

- The key is the URL segment: `api/01-client.md` is served at `/api/client`.
- `label` names the section, in the sidebar and in the browser title of its
  pages; it defaults to the key.
- A directory can sit outside the project, such as the `docs/` of a package. No
  section's directory can be inside another's.
- Sections appear in the order they are declared. `docsDir` is read alongside
  them only when you set it: its pages sit outside every section, come first,
  and the first of them opens the docs. Its directory cannot hold a section's.
- Previous and next links run on from one section into the next.
- The first page of the first section opens at `routeBase`; the first page of
  every other section opens at the section's own URL.
- The rules above apply inside each section.

This documentation is built that way: one section for JAAMD and one for JAAD,
each read from its package.

## Overriding the file tree

[Frontmatter](../02-configurations/02-frontmatter.md) renames a page, moves it
without renaming the file, or keeps it out of the build:

```markdown
---
title: Images & Videos
label: Media
order: 5
draft: true
---
```

## More than one language

Directories named after language codes turn the tree into one site per
language, and the rules above then apply inside each of them. With sections,
every section holds the same language directories. See
[Languages](../02-configurations/03-i18n.md).

## Markdown

Pages are rendered with [JAAMD](../../../astro/docs/00-overview.md): alerts,
code tabs, tables of contents and spoilers are written as described in
[Markdown syntax](../../../astro/docs/02-markdown.md).
