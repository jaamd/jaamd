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
    01-setup.md          → /guides/setup/
    02-deployment.md     → /guides/deployment/
  03-reference.md        → /reference/
```

The same tree builds the sidebar, the mobile menu, the line above each title and the
previous and next links.

## Rules

- A numeric prefix sets the order and is removed from the URL. Files without
  one sort after the numbered files. Files with the same number sort by name.
- A folder becomes a chapter. Only one folder level is supported. A folder
  without a prefix takes the place of its first page.
- The first `# Heading` is the page title.
- The `##` and `###` headings make the page's table of contents. Wrap headings
  in `<div data-toc-ignore>` to leave them out.
- Removing the prefixes must leave every page and chapter with a unique path.

Invalid nesting and duplicate paths stop the build and name the conflicting
files.

## The opening page

The file that sorts first opens the documentation at
[`routeBase`](../03-configuration/10-routeBase.md), which is `/` by default. Its
browser title is the site name alone, and its own slug redirects to it: with
`routeBase: "/docs"`, `01-introduction.md` opens at `/docs/`, and
`/docs/introduction/` redirects there.

## Linking between pages

Link to another page by its file, relative to the one you are writing:

```markdown
See [Deployment](./02-guides/02-deployment.md#hosting).
```

JAAD turns the link into the page's URL, so it also works on GitHub and in an
editor. A link to a file that does not exist stops the build.

## Sections

A larger site can split its documentation into sections, each from a directory
of its own, with its own chapters and sidebar group. The rules above apply
inside each one. See [`sections`](../03-configuration/11-sections.md).

## Overriding the file tree

[Frontmatter](03-frontmatter.md) renames a page or moves it
without renaming the file:

```markdown
---
title: Images & Videos
label: Media
order: 5
---
```

## More than one language

Directories named after language codes turn the tree into one site per
language, and the rules above then apply inside each of them. With sections,
every section holds the same language directories. See
[Languages](../02-guides/01-languages.md).

## Markdown

Pages are rendered with [JAAMD](../../../astro/docs/00-overview.md): alerts,
code tabs, tables of contents and spoilers are written as described in
[Markdown syntax](../../../astro/docs/02-markdown.md).
