---
label: Overview
---

# JAAMD

**Just Another Astro Markdown**: markdown plugins, client-side enhancements and
styles as a single Astro integration.

JAAMD adds to the markdown you already write:

- [alerts](./02-markdown.md#alerts), [code tabs](./02-markdown.md#code-tabs), a
  [table of contents](./02-markdown.md#table-of-contents) and
  [spoilers](./02-markdown.md#spoilers);
- heading anchors and scrollable tables, in the built HTML;
- copy buttons, an image lightbox and keyboard support, from a
  [client script](./03-usage/02-client.md);
- a stylesheet driven by [CSS variables](./04-styling/01-variables.md), with
  [eight theme presets](./04-styling/02-themes.md).

## Packages

| Package        | What it is                                                                     |
| -------------- | ------------------------------------------------------------------------------ |
| `@jaamd/astro` | The Astro integration and the `<MarkdownContent>` component. Install this one. |
| `@jaamd/core`  | The plugins, the client script and the styles, with no framework around them.  |
| `@jaamd/jaad`  | A documentation site generator built on JAAMD.                                 |

`@jaamd/astro` brings `@jaamd/core` with it: an Astro project never installs
core itself. To use JAAMD with another framework, see
[Other frameworks](./05-advanced/03-other-frameworks.md).

Continue with [Installation](./01-getting-started/01-installation.md).
