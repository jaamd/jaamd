---
description: The blocks JAAMD adds to CommonMark and GitHub Flavored Markdown, each with its result.
keywords: [alerts, code tabs, toc, spoilers, directives]
---

# Markdown syntax

JAAMD extends [CommonMark](https://commonmark.org/help/) and
[GitHub Flavored Markdown](https://github.github.com/gfm/) with the blocks
below. Each one is shown as you write it, then as it renders. Every one of them
can be turned off with the
[`features` option](./01-getting-started/02-options.md#features).

## Alerts

GitHub-style blockquote alerts, in five types: `NOTE`, `TIP`, `IMPORTANT`,
`WARNING` and `CAUTION`.

```markdown
> [!NOTE]
> Useful information the reader should know.

> [!WARNING]
> Urgent information needing immediate attention.
```

> [!NOTE]
> Useful information the reader should know.

> [!WARNING]
> Urgent information needing immediate attention.

## Code tabs

Group several code blocks into a tabbed panel. The text after the language is
the tab label; it falls back to the language, then to `Tab N`.

````markdown
:::code-tabs

```bash npm
npm install
```

```bash pnpm
pnpm install
```

:::
````

:::code-tabs

```bash npm
npm install
```

```bash pnpm
pnpm install
```

:::

## Table of contents

A `:::toc` block wraps the list you write in a navigation landmark. Nothing is
generated: entries, order, wording and depth are whatever the Markdown says.
The text in brackets is an optional title.

```markdown
:::toc[On this page]

- [Alerts](#alerts)
- [Code tabs](#code-tabs)

:::
```

:::toc[On this page]

- [Alerts](#alerts)
- [Code tabs](#code-tabs)

:::

A `-` list loses its bullets, `1.` keeps the numbers. Entries are plain anchors
and navigate with JavaScript disabled; with it, the entry whose section is on
screen is marked `aria-current="location"`. The title is a `<p>`, so it stays
out of `getHeadings()` and has no anchor.

### Writing the anchors

Heading ids come from Astro, slugged with
[`github-slugger`](https://github.com/Flet/github-slugger):

| Heading                  | Anchor                                                                   |
| ------------------------ | ------------------------------------------------------------------------ |
| `## Getting started`     | `#getting-started`                                                       |
| `## Details / accordion` | `#details--accordion` (one dash per space, the `/` dropped between them) |
| `## What's new?`         | `#whats-new` (punctuation removed, not replaced)                         |
| `## snake_case`          | `#snake_case` (underscores survive)                                      |
| a second `## Setup`      | `#setup-1`                                                               |

The client script follows the same rules, so ids match for Markdown that never
went through Astro's pipeline (`set:html`, HTML from a CMS).

With a sticky header, raise `--jaamd-scroll-margin-top` (default `80px`).

> [!NOTE]
> `:::toc` needs the directive syntax, on by default. With
> `features: { toc: false }` the block degrades to a plain `<div>`: list and
> links intact, unstyled.

## Spoilers

Text hidden until the reader activates it, inline or as a block. Spoilers are
reachable from the keyboard and hide again on reload.

```markdown
The answer is :spoiler[42].

:::spoiler
A whole paragraph, hidden.
:::
```

The answer is :spoiler[42].

:::spoiler
A whole paragraph, hidden.
:::

In HTML you write yourself, the class is `jaamd-spoiler`.

## Details

`<details>` is plain HTML. JAAMD styles it and animates it open and closed, in
CSS alone.

```html
<details>
    <summary>Why is the sky blue?</summary>
    Shorter wavelengths scatter more.
</details>
```

<details>
    <summary>Why is the sky blue?</summary>
    Shorter wavelengths scatter more.
</details>

## Without writing anything

Some enhancements need no syntax. Every heading gets an anchor link, every code
block a copy button, every image a lightbox, and every table a scroll container
on narrow screens. See [Client script](./03-usage/02-client.md).
