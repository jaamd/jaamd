---
label: Welcome
description: What JAAMD is, and how JAAMD and JAAD differ.
---

# Welcome to JAAMD

JAAMD is a set of packages for writing in Markdown with
[Astro](https://astro.build). It comes in two parts, documented here one after
the other.

## JAAMD: richer Markdown in your Astro site

[JAAMD](../../packages/astro/docs/00-overview.md) is an Astro integration. It
adds to the Markdown your site already renders: alerts, code tabs, a table of
contents and spoilers; heading anchors, copy buttons and an image lightbox; a
stylesheet driven by CSS variables, with eight theme presets.

Your pages, layouts and routes stay yours. JAAMD only changes how Markdown
looks and behaves.

```bash
npx astro add @jaamd/astro
```

## JAAD: a documentation site from a folder

[JAAD](../../packages/jaad/docs/00-overview.md) builds a whole documentation
site from a folder of Markdown files: navigation from the file tree, search,
languages, page metadata and an `llms.txt` for language models. Its pages are
rendered with JAAMD, so everything above comes with it.

```bash
npm create @jaamd/jaad@latest
```

## Where to start

Use JAAMD when you already have an Astro site and want its Markdown to do more.
Use JAAD when what you need is documentation: it brings JAAMD with it.
