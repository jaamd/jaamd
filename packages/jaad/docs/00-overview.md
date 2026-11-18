---
description: JAAD turns a folder of Markdown files into a documentation site.
---

# Overview

**Just Another Astro Docs**: JAAD is an Astro integration that turns a folder
of Markdown files into a documentation site. The folder is the configuration:
there is no sidebar to declare and no route to write.

<figure class="how-it-works">
<table class="how-map">
<thead><tr><th>In <code>docs/</code></th><th>On the site</th></tr></thead>
<tbody>
<tr><td><code>docs/</code></td><td>the documentation, at <code>routeBase</code></td></tr>
<tr><td><code>├─ 01-introduction.md</code></td><td><code>/</code> Introduction, the opening page</td></tr>
<tr><td><code>├─ 02-guides/</code></td><td>Guides, a chapter of the sidebar</td></tr>
<tr><td><code>│  ├─ 01-setup.md</code></td><td><code>/guides/setup/</code> Setup</td></tr>
<tr><td><code>│  └─ 02-deployment.md</code></td><td><code>/guides/deployment/</code> Deployment</td></tr>
<tr><td><code>└─ 03-reference.md</code></td><td><code>/reference/</code> Reference</td></tr>
</tbody>
</table>
<div class="how-window" aria-hidden="true">
<div class="how-bar"><span></span><span></span><span></span><code>example.dev/guides/setup/</code></div>
<div class="how-body">
<ul class="how-nav"><li>Introduction</li><li class="how-chapter">Guides<ul><li class="how-current">Setup</li><li>Deployment</li></ul></li><li>Reference</li></ul>
<div class="how-page"><b>Setup</b><i></i><i></i><i></i><b>Install</b><i></i><i></i><b>Configure</b><i></i></div>
<ul class="how-toc"><li class="how-chapter">On this page</li><li class="how-current">Install</li><li>Configure</li></ul>
</div>
</div>
<figcaption>Numbers set the order and leave the URLs, a folder becomes a chapter of the sidebar, and the <code>##</code> and <code>###</code> headings of a page become its table of contents.</figcaption>
</figure>

- **Navigation** from the file tree: sidebar, chapters, previous
  and next links. See [Pages and structure](01-getting-started/02-pages.md).
- **Search** across every page, built at compile time, with no external
  service. See [Search](02-configurations/04-search.md).
- **Languages**, one site per locale directory, with a switcher and `hreflang`.
  See [Languages](02-configurations/03-i18n.md).
- **Themes** for the interface and the code, light and dark. See
  [Themes](02-configurations/05-themes.md).
- **Metadata** for search engines and social cards, and a sitemap.
- **Files for language models and agents**: `llms.txt`, `llms-full.txt` and
  every page as Markdown that reads on its own. See
  [LLMs and agents](02-configurations/09-llms.md).

Pages are rendered with [JAAMD](https://docs.jaamd.org/jaamd), so its
Markdown syntax and enhancements come with them.

Start with [Installation](01-getting-started/01-installation.md).
