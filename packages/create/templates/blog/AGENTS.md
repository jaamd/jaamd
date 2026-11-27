# Repository guide

The blog here is built with [JAAB](https://docs.jaamd.org/jaab), an Astro
integration that turns the `blog/` folder into a site. There are no page
components to write: a markdown file in `blog/` is a post.

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
| `blog/`                 | The posts, and `index.md` above their list      |
| `jaab.config.ts`        | Every JAAB option                               |
| `src/jaad.css`          | Colours, fonts and widths (create it if absent) |
| `astro.config.mjs`      | Re-exports JAAB's Astro config; leave it alone  |
| `src/content.config.ts` | Re-exports JAAB's collection; leave it alone    |

JAAB's own stylesheet is precompiled: installing it does not bring Tailwind
into this project.

`src/pages/` is for pages of your own, which keep their own layout.

## Writing posts

- `npx jaab new "Title of the post"` writes `blog/title-of-the-post.md`, dated
  today. `--dir` makes a directory with an `index.md`, for images beside it.
- The file name is the address: `hello-world.md` is `/hello-world/`. A date in
  front, as in `2026-11-22-hello-world.md`, is left out of it.
- A post is published when it is in `blog/`: there are no drafts, and the
  build stops on a `draft` field. Keep a post elsewhere until it is ready.
- Link to another post by its file: `[the first post](hello-world.md)`. JAAB
  turns it into the post's address; a link to a missing file stops the build.
- `blog/index.md` is the text above the list: its title heads the index.

`date` is the only field a post needs:

```markdown
---
title: Images & Videos # otherwise the first # heading
date: 2026-11-22 # orders the posts; a day, or a time with its offset
description: Add accessible images. # in the index, the feed and the metadata
tags: [markdown, media] # metadata and the feed only, never shown
authors: [ada] # keys of the authors option
aliases: [/2026/11/media/] # old addresses, redirected here
lastUpdated: 2026-11-30 # shown as "Updated" at the end
ogImage: /og/media.png # social image for this post
---
```

## The feed

`/rss.xml` carries the newest posts in full, and needs absolute URLs: until
`site` is set in `jaab.config.ts`, such as `site: "https://example.com"`, the
build warns and writes no feed.

## Changing the site

Title, logo, navigation, social links, footer and theme are options in
`jaab.config.ts`, the same as JAAD's site options. Colours, fonts and layout
widths are CSS custom properties in `src/jaad.css`. For a blog inside a site
with a look of its own, `layout` hands every page to a layout of the project.

## Documentation

The JAAB documentation is installed with it, in `node_modules/@jaamd/jaab/docs/`.
Read the guide for a task before working on it:

- Posts and their frontmatter: `node_modules/@jaamd/jaab/docs/01-getting-started/02-posts.md`
- Configuration reference: `node_modules/@jaamd/jaab/docs/02-configurations/01-reference.md`
- Site options, from title to theme: https://docs.jaamd.org/jaad/configurations/reference.md
- Markdown syntax: https://docs.jaamd.org/jaamd/markdown.md
- Feed and metadata: `node_modules/@jaamd/jaab/docs/02-configurations/02-feed.md`
- Migrating posts from another blog: `node_modules/@jaamd/jaab/docs/02-configurations/03-migrating.md`
- A layout of your own: `node_modules/@jaamd/jaab/docs/02-configurations/04-layout.md`

The same pages are published at https://docs.jaamd.org/jaab.
