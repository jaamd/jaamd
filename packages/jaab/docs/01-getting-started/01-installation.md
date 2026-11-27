---
description: Add JAAB to a project, alone or beside JAAD.
---

# Installation

## Create a project

:::code-tabs

```bash npm
npm create @jaamd@latest -- --template blog
```

```bash pnpm
pnpm create @jaamd@latest --template blog
```

```bash yarn
yarn create @jaamd --template blog
```

```bash bun
bunx @jaamd/create@latest --template blog
```

:::

The CLI asks for a destination, title and whether to install dependencies. The
`blog` template puts the posts at `/`; `--template docs-blog` sets up
[docs and a blog](#docs-and-a-blog) together, with the docs at `/` and the blog
at `/blog`, and without `--template` the CLI asks. `--here` adds them to a repository you already
have, without overwriting a file; the options are in the
[scaffolder's README](https://github.com/jaamd/jaamd/tree/main/packages/create).

## A blog

To add JAAB by hand, install it with Astro:

```bash
npm i @jaamd/jaab astro
```

Then add three files. `astro.config.mjs` takes the whole Astro config from JAAB:

```js
export { default } from '@jaamd/jaab/site'
```

`jaab.config.ts` holds the options, described in the
[reference](../02-configurations/01-reference.md):

```ts
import { defineJaabConfig } from '@jaamd/jaab'

export default defineJaabConfig({
    site: 'https://example.dev',
    title: 'My blog',
})
```

`src/content.config.ts` declares the posts:

```ts
export { collections } from '@jaamd/jaab/content'
```

Write the first post with `npx jaab new "Hello"`, then run `npx astro dev`. See
[Posts](02-posts.md).

## Docs and a blog

A site with documentation and a blog installs JAAD and JAAB. They share the
header, the footer, the theme and the fonts, so they take the same site options:
`defineSiteConfig` holds them once, and each config spreads them.

`site.config.ts` holds the shared options:

```ts
import { defineSiteConfig } from '@jaamd/jaab'

export default defineSiteConfig({
    title: 'My project',
    nav: [
        { label: 'Docs', href: '/' },
        { label: 'Blog', href: '/blog/' },
    ],
})
```

`astro.config.mjs` gives them to both, each with its own options after them:

```js
import jaab from '@jaamd/jaab'
import jaad from '@jaamd/jaad'
import { defineConfig } from 'astro/config'
import site from './site.config.ts'

export default defineConfig({
    site: 'https://example.dev',
    integrations: [jaad({ ...site, routeBase: '/' }), jaab({ ...site, routeBase: '/blog' })],
})
```

`src/content.config.ts` declares the docs and the posts:

```ts
import { collections as blog } from '@jaamd/jaab/content'
import { collections as docs } from '@jaamd/jaad/content'

export const collections = { ...docs, ...blog }
```

The build stops when the two set a site option differently, or when a page of
one would be served inside the other. Search stays on the docs; the feed is
linked from every page; `/llms.txt` has a section for each.
