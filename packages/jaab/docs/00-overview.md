---
description: JAAB turns a folder of Markdown files into a blog.
---

# Overview

**Just Another Astro Blog**: JAAB is an Astro integration that turns a folder
of Markdown files into a blog. A post is a file, and it is published when it is
in the folder: there are no drafts to hide and no dates to wait for.

| In `blog/`                       | On the site                           |
| -------------------------------- | ------------------------------------- |
| `index.md`                       | the text above the list of posts      |
| `2026-11-22-introducing-jaab.md` | `/introducing-jaab/`                  |
| `photos/index.md`                | `/photos/`, with its images beside it |
|                                  | `/page/2/`, the older posts           |
|                                  | `/rss.xml`, the newest posts in full  |

- **The index**, newest first, with the date, the title and the description of
  each post, ten to a page. See [Posts](01-getting-started/02-posts.md).
- **The post**, with its date, reading time and authors above the title, the
  table of contents beside it, and links to the older and newer posts below.
- **A feed** in RSS 2.0, linked from every page. See
  [Feed and metadata](02-guides/01-feed.md).
- **The shell of JAAD**: the same header, footer, themes and type. A site with
  docs and a blog installs both. See
  [Installation](01-getting-started/01-installation.md#docs-and-a-blog).
- **Your own layout** for a blog inside a site that already has its look: JAAB
  keeps the pages, the feed and the metadata, and your layout draws them. See
  [Layout](02-guides/03-layout.md).

Every option is in [Options](03-configuration/01-options.md).
