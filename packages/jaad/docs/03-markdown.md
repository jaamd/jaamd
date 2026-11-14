# Markdown

JAAD supports [CommonMark](https://commonmark.org/help/) and
[GitHub Flavored Markdown](https://github.github.com/gfm/).
[JAAMD](../../astro/docs/00-overview.md) adds the features below
automatically.

## Table of contents

Use `:::toc` to generate a table of contents:

```markdown
:::toc[Components]

- [Table of contents](#table-of-contents)
- [Code tabs](#code-tabs)
- [Alerts](#alerts)
- [Spoilers](#spoilers)

:::
```

:::toc[Components]

- [Table of contents](#table-of-contents)
- [Code tabs](#code-tabs)
- [Alerts](#alerts)
- [Spoilers](#spoilers)

:::

## Code tabs

Use `:::code-tabs` and add the tab label after each language identifier:

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

## Alerts

Use GitHub-style blockquote alerts:

```markdown
> [!NOTE]
> Useful context.

> [!WARNING]
> A consequence the reader should avoid.
```

> [!NOTE]
> Useful context.

Available types are `NOTE`, `TIP`, `IMPORTANT`, `WARNING` and `CAUTION`.

## Spoilers

Hide text inline with `:spoiler[…]`, or a block with `:::spoiler`:

```markdown
The answer is :spoiler[42].

:::spoiler
A paragraph hidden until the reader activates it.
:::
```

Spoilers are keyboard accessible and return to their hidden state after a page
reload.

## Automatic enhancements

JAAD also adds copy buttons to code blocks, links to headings, an image
lightbox and animated `<details>` elements. No configuration is required.
