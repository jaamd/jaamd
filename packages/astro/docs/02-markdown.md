# Markdown syntax

JAAMD extends CommonMark and GitHub Flavored Markdown with the blocks below.
Every one of them can be turned off in the
[`plugins` option](./01-getting-started/02-options.md#plugins).

## Alerts

GitHub-style blockquote alerts, in five variants:

```markdown
> [!NOTE]
> Useful information the reader should know.

> [!TIP]
> Helpful advice.

> [!IMPORTANT]
> Key information required to succeed.

> [!WARNING]
> Urgent information needing immediate attention.

> [!CAUTION]
> Advises about risks or negative outcomes.
```

## Code tabs

Group several code blocks into a tabbed panel. The text after the language is
used as the tab label; it falls back to the language, then to `Tab N`.

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

## Table of contents

A `:::toc` block wraps the list you write in a navigation landmark. Nothing is
generated: entries, order, wording and depth are whatever the markdown says.
The text in brackets is an optional title.

```markdown
:::toc[On this page]
- [Installation](#installation)
- [Setup](#setup)
    - [Integration options](#integration-options)
:::
```

It renders as:

```html
<nav class="jaamd-toc" aria-label="On this page">
    <p class="jaamd-toc-title">On this page</p>
    <ul>
        …your list…
    </ul>
</nav>
```

The title is a `<p>`: out of `getHeadings()`, no anchor icon. A `-` list loses
its bullets, `1.` keeps the numbers. Entries are plain anchors and navigate with
JavaScript disabled; with it, the entry whose section is on screen is marked
`aria-current="location"`.

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

The client-side fallback follows the same rules, so ids match for markdown that
never went through Astro's pipeline (`set:html`, HTML from a CMS).

With a sticky header, raise `--jaamd-scroll-margin-top` (default `80px`).

> [!NOTE]
> `:::toc` needs the directive syntax, on by default. With `features: { toc: false }`
> the block degrades to a plain `<div>`: list and links intact, unstyled.

## Spoilers

Text hidden until the reader activates it, inline or as a block:

```markdown
:spoiler[The butler did it.]

:::spoiler
A whole paragraph, hidden.
:::
```

In HTML you write yourself, the class is `jaamd-spoiler`.
