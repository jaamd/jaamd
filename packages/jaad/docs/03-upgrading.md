---
description: How to upgrade JAAD, and the changes that need action, by the version you upgrade from.
---

# Upgrading

JAAD is usually upgraded together with Astro: each JAAD release targets one Astro
major, and most releases follow an Astro release. Upgrade both at once:

:::code-tabs

```bash npm
npx @astrojs/upgrade
```

```bash pnpm
pnpm dlx @astrojs/upgrade
```

```bash yarn
yarn dlx @astrojs/upgrade
```

```bash bun
bunx @astrojs/upgrade
```

:::

To upgrade JAAD alone:

:::code-tabs

```bash npm
npm install @jaamd/jaad@latest
```

```bash pnpm
pnpm add @jaamd/jaad@latest
```

```bash yarn
yarn add @jaamd/jaad@latest
```

```bash bun
bun add @jaamd/jaad@latest
```

:::

Then run a build and read below the changes since the version you upgrade from.

## From @lancher-dev/jaad

JAAD and JAAMD moved to the `@jaamd` scope. The old packages are deprecated and
receive no further releases.

Replace the dependency:

```bash
npm uninstall @lancher-dev/jaad
npm install @jaamd/jaad
```

Then replace `@lancher-dev/jaad` with `@jaamd/jaad` in every import:
`astro.config.*`, `src/content.config.*`, `jaad.config.ts`, and any page using
`@jaamd/jaad/layouts/Page.astro` or `@jaamd/jaad/advanced`. A project that
imports `@lancher-dev/jaamd` directly needs `@jaamd/astro` instead.

The documentation moved from `jaad.lancher.dev` to `docs.jaamd.org/jaad`: update
the links in `AGENTS.md` if `create-jaad` generated one.

## From 0.11

### @jaamd/jaamd is now @jaamd/astro

JAAD installs it for you: a site that only uses `@jaamd/jaad` has nothing to do.
A project that imports `@jaamd/jaamd` directly follows
[JAAMD's upgrade guide](../../astro/docs/06-upgrading.md#from-012).

### Page titles name their section

With [sections](01-getting-started/02-pages.md#sections), the browser title of
a page is `Page · Section | Site`, so pages with the same name in two sections
no longer share a title. Docs without sections are unchanged.

### Custom docs frame: renamed navigation types

"Section" now names a part of the documentation with its own directory. A
`src/jaad/DocsFrame.astro` that reads the navigation follows these renames:

| Before                          | After               |
| ------------------------------- | ------------------- |
| `navigation.sections`           | `navigation.groups` |
| `NavSection`                    | `DocsNavGroup`      |
| `DocsHeadings`                  | `DocsHeading`       |
| `order` on a group              | removed             |
| `primaryOrder` on `DocsNavItem` | removed             |

Groups and items arrive in display order, so nothing replaces the two removed
fields.

`DocsEntry` is no longer exported: no prop of the frame carried it. The page a
frame renders is `DocsFrameProps['page']`.

### Fewer exports

`@jaamd/jaad` exports `jaad()`, `defineJaadConfig()` and the `JaadUserConfig`
type. `defineJaadSite`, `JaadConfig` and `JaadResolvedConfig` are gone:
`@jaamd/jaad/site` builds the Astro configuration, and the resolved
configuration, `virtual:jaad/config` included, is internal.

## From 0.9

### Tailwind on your own pages

0.9 left Tailwind to the site: plugin in `astro.vite.plugins` and a stylesheet
importing `tailwindcss`. Replace both with the option:

```ts
// jaad.config.ts
defineJaadConfig({ title: 'My Project', tailwind: true })
```

- Remove `@tailwindcss/vite` from `astro.vite.plugins`. If it stays, JAAD
  leaves it and skips its own.
- Remove CSS that imports `tailwindcss` for pages using `Page`: it adds a second
  preflight and Tailwind's default fonts over JAAD's. Utilities now read JAAD's
  tokens directly (`bg-surface`, `text-primary`), with no `@theme` to write.
- Pages on a local layout keep their own `@import "tailwindcss";`.
- `tailwindcss` and `@tailwindcss/vite` stay in your devDependencies.

See [Styles](02-configurations/06-styles.md#tailwind).

### Component classes

JAAD's markup no longer uses Tailwind utilities: every element has a
`jaad-*` or `docs-*` class, styled in `@layer components`. CSS that targeted
utilities in JAAD's markup needs the new names:

| Before                           | Now                                   |
| -------------------------------- | ------------------------------------- |
| `body` utilities                 | `.jaad-body`                          |
| default frame wrapper `contents` | `.docs-frame`                         |
| `.theme-icon-to-dark` / `-light` | `.jaad-theme-icon-to-dark` / `-light` |
| active ToC link class            | `[aria-current="location"]`           |

`dist/jaad.css` no longer contains stray utilities (`.hidden`, `.block`,
`.relative`, …). Pages that used them without Tailwind need `tailwind: true` or
their own CSS.

## From 0.8

JAAD ships a precompiled stylesheet and no longer depends on Tailwind. Until
0.8 its Tailwind plugin also generated the utilities used in your own pages;
from 0.9 those classes are missing unless the site provides Tailwind. Use
`tailwind: true` (see [From 0.9](#from-09)).

## From 0.7

`@jaamd/jaad/layouts/Base.astro` is gone. It forwarded every prop to the
page layout: change the import to `@jaamd/jaad/layouts/Page.astro`.
