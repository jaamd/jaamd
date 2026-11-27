---
description: The changes that need action, by the JAAMD version you upgrade from.
---

# Upgrading

Upgrade the integration, then read below the changes since the version you
upgrade from:

:::code-tabs

```bash npm
npm install @jaamd/astro@latest
```

```bash pnpm
pnpm add @jaamd/astro@latest
```

```bash yarn
yarn add @jaamd/astro@latest
```

```bash bun
bun add @jaamd/astro@latest
```

:::

## From 1.1

### No `draft` in the frontmatter fields

`frontmatterFields(z)` no longer declares `draft`, which JAAMD only declared
and never read. A site that leaves its own drafts out of the build adds the
field to its schema, next to the spread: `draft: z.boolean().default(false)`.

## From 1.0

### Node 22.23.4

JAAMD requires Node 22.23.4 or later.

### Spoilers stay revealed

A revealed spoiler stays open until the page reloads, and reads as ordinary
content: its links work and its text can be selected. Without JavaScript,
spoilers are shown.

### `--jaamd-font-serif` is gone

No style read it. Remove it from your stylesheet; nothing changes on screen.

### Legacy alert options

On unified, the `legacyTitle` and `tagName` options of the alert plugin are
deprecated and will be removed in 2.0.

## From 0.x

Upgrade to 1.1 first, following
[its guide](https://github.com/jaamd/jaamd/blob/v1.1.0/packages/astro/docs/06-upgrading.md),
then apply the changes above.
