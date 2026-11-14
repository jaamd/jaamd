---
label: Welcome
description: What JAAMD and JAAD are, and which one to start with.
---

# Welcome to JAAMD

JAAMD refines Markdown. It is documented here in two parts: JAAMD itself, and
JAAD, the documentation site built on it.

## JAAMD

[JAAMD](../../packages/astro/docs/00-overview.md) is an Astro integration for
the site you already have. It adds alerts, code tabs, tables of contents and
spoilers to your Markdown, and heading anchors, copy buttons, a lightbox and
themes to the page that shows it. Your pages, layouts and routes stay yours.

```bash
npx astro add @jaamd/astro
```

## JAAD

[JAAD](../../packages/jaad/docs/00-overview.md) builds a whole documentation
site from a folder of Markdown files: navigation, search, languages and
metadata, with JAAMD rendering every page. This site is built with it.

```bash
npm create @jaamd/jaad@latest
```

## Which one

Start with JAAMD when you have an Astro site and want its Markdown to do more.
Start with JAAD when what you need is documentation: it brings JAAMD with it.
