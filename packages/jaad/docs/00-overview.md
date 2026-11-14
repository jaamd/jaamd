---
description: JAAD turns a folder of Markdown files into a documentation site.
---

# Overview

**Just Another Astro Docs**: JAAD is an Astro integration that turns a folder
of Markdown files into a documentation site. The folder is the configuration:
there is no sidebar to declare and no route to write.

- **Navigation** from the file tree: sidebar, chapters, previous
  and next links. See [Pages and structure](01-getting-started/02-pages.md).
- **Search** across every page, built at compile time, with no external
  service. See [Search](02-configurations/04-search.md).
- **Languages**, one site per locale directory, with a switcher and `hreflang`.
  See [Languages](02-configurations/03-i18n.md).
- **Themes** for the interface and the code, light and dark. See
  [Themes](02-configurations/05-themes.md).
- **Metadata** for search engines and social cards, a sitemap, raw Markdown
  routes and an `llms.txt` for language models.

Pages are rendered with [JAAMD](../../astro/docs/00-overview.md), so its
Markdown syntax and enhancements come with them.

Start with [Installation](01-getting-started/01-installation.md).
