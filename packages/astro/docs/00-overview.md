---
description: JAAMD refines the Markdown you already write, as one Astro integration.
---

# Overview

**Just Another Astro Markdown**: Markdown plugins, client-side enhancements and
styles as a single Astro integration. Your pages, layouts and routes stay
yours; JAAMD only changes how Markdown looks and behaves.

- **In the Markdown you write:** [alerts](./02-markdown.md#alerts),
  [code tabs](./02-markdown.md#code-tabs), a
  [table of contents](./02-markdown.md#table-of-contents) and
  [spoilers](./02-markdown.md#spoilers).
- **In the built HTML:** heading anchors and scrollable tables.
- **In the browser:** copy buttons, an image lightbox and keyboard support,
  from a [client script](./03-usage/02-client.md).
- **In the stylesheet:** [CSS variables](./04-styling/01-variables.md) and
  [eight theme presets](./04-styling/02-themes.md).

## Packages

| Package        | What it is                                                                       |
| -------------- | -------------------------------------------------------------------------------- |
| `@jaamd/astro` | The Astro integration and the `<MarkdownContent>` component. Install this one.   |
| `@jaamd/core`  | The plugins, the client script and the styles, with no framework around them.    |
| `@jaamd/jaad`  | A [documentation site generator](../../jaad/docs/00-overview.md) built on JAAMD. |

`@jaamd/astro` brings `@jaamd/core` with it: an Astro project never installs
core itself. To use JAAMD with another framework, see
[Other frameworks](./05-advanced/03-other-frameworks.md).

Start with [Installation](./01-getting-started/01-installation.md).
