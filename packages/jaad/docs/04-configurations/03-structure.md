# Structure

Documentation can contain top-level pages and one level of chapters:

```
docs/
  01-introduction.md
  02-guides/
    01-setup.md
    02-deployment.md
  03-reference.md
```

This produces `/`, `/guides/setup`, `/guides/deployment` and `/reference`.

## Rules

- Numeric prefixes control order and are removed from URLs.
- Files without a prefix sort after numbered files.
- A folder becomes a collapsible chapter.
- Only one folder level is supported, per language.
- The first `# Heading` becomes the page title.
- The first sorted page owns `routeBase`; its named URL redirects there.
- Removing prefixes must leave every page and chapter with a unique path.

Invalid nesting or duplicate paths stop the build and list the conflicting
source files.

The same structure generates the sidebar, mobile selectors, breadcrumbs and
previous/next links; no navigation configuration is required.

## Linking between pages

Link to another page by its file, relative to the one you are writing:

```markdown
See [Deployment](./02-guides/02-deployment.md#hosting).
```

JAAD turns the link into the page's URL, so it also works on GitHub and in an
editor. A link to a file that does not exist stops the build.

## Sections

A larger site can split its documentation into sections, each with its own
directory, chapters and sidebar:

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
- `label` names the section; it defaults to the key.
- A directory can sit outside the project, such as the `docs/` of a package.
  No section's directory can be inside another's.
- Sections appear in the order they are declared. `docsDir` is read
  alongside them only when you set it: its pages sit outside every section,
  come first, and the first of them opens the docs. Its directory cannot hold
  a section's.
- The sidebar lists every section, under its label, with its pages and
  chapters below. Previous and next links run on from one section into the
  next.
- The first page of the first section opens at `routeBase`; the first page of
  every other section opens at the section's own URL.
- The rules above apply inside each section: one level of chapters, unique
  paths.

## Overriding the file tree

Optional [frontmatter](02-frontmatter.md) renames a page, moves
it without renaming the file, or keeps it out of the build:

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
language, and the nesting limit then applies inside each of them. With
sections, every section holds the same language directories. See
[Languages](10-i18n.md).
