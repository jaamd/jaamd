---
description: Create a JAAD project, or add JAAD to an existing repository or Astro project.
---

# Installation

`npm create @jaamd` sets up a project in one command. To add JAAD by hand, see
[Manual installation](#manual-installation).

## Create a project

:::code-tabs

```bash npm
npm create @jaamd@latest
```

```bash pnpm
pnpm create @jaamd@latest
```

```bash yarn
yarn create @jaamd
```

```bash bun
bunx @jaamd/create@latest
```

:::

The CLI asks for a template, destination, title and whether to install
dependencies. The `docs` template puts documentation at `/`; `site` adds a
landing page at `/` and moves documentation to `/docs`; `docs-blog` adds a
[JAAB](https://docs.jaamd.org/jaab) blog at `/blog`.

To provide every answer as flags:

:::code-tabs

```bash npm
npm create @jaamd@latest my-docs -- --template docs --title "My Docs" --install
```

```bash pnpm
pnpm create @jaamd@latest my-docs --template docs --title "My Docs" --install
```

```bash yarn
yarn create @jaamd my-docs --template docs --title "My Docs" --install
```

```bash bun
bunx @jaamd/create@latest my-docs --template docs --title "My Docs" --install
```

:::

Use `--here` inside an existing repository:

:::code-tabs

```bash npm
npm create @jaamd@latest -- --here --template docs
```

```bash pnpm
pnpm create @jaamd@latest --here --template docs
```

```bash yarn
yarn create @jaamd --here --template docs
```

```bash bun
bunx @jaamd/create@latest --here --template docs
```

:::

The command keeps the existing `package.json` and Markdown files. It stops
without writing when a custom Astro or Content configuration requires a manual
merge, and when `--template site` meets a `jaad.config.*` it did not write:
the landing page needs `routeBase: "/docs"`, which only you can set.

> [!NOTE]
> Non-interactive environments require a destination or `--here`, `--title`,
> and either `--install` or `--no-install`.

## Run locally

:::code-tabs

```bash npm
npm run dev
```

```bash pnpm
pnpm dev
```

```bash yarn
yarn dev
```

```bash bun
bun run dev
```

:::

The development server starts at `http://localhost:4321`.

Add pages to `docs/`, following the conventions in
[Pages and structure](02-pages.md).

## Manual installation

Install JAAD in a project on Astro 7.3 or a later 7.x, with Node.js 22.23.4 or later:

:::code-tabs

```bash npm
npm install @jaamd/jaad
```

```bash pnpm
pnpm add @jaamd/jaad
```

```bash yarn
yarn add @jaamd/jaad
```

```bash bun
bun add @jaamd/jaad
```

:::

Add the following files:

```ts
// jaad.config.ts
import { defineJaadConfig } from '@jaamd/jaad'

export default defineJaadConfig({
    site: 'https://example.dev',
    title: 'My Project',
})
```

```js
// astro.config.mjs
export { default } from '@jaamd/jaad/site'
```

```ts
// src/content.config.ts
export { collections } from '@jaamd/jaad/content'
```

```json
// tsconfig.json
{
    "extends": "astro/tsconfigs/strict"
}
```

Only `title` is required. See the
[configuration reference](../02-configurations/01-reference.md) for the remaining
options.

## Existing Astro project

If `--here` reports custom `astro.config.*` or `src/content.config.*` files,
keep their existing configuration and merge JAAD manually.

Add the integration to the Astro configuration:

```ts
// astro.config.ts
import jaad from '@jaamd/jaad'
import { defineConfig } from 'astro/config'
import jaadConfig from './jaad.config'

export default defineConfig({
    site: jaadConfig.site,
    base: jaadConfig.base,
    integrations: [jaad(jaadConfig)],
})
```

`jaad()` returns integrations only. `site` and `base` are lifted above. Of the
[`astro`](../02-configurations/01-reference.md#extending-astro) field, only
`astro.fonts` is read here, to load those fonts on JAAD's pages: write the
other options, and the same fonts, in `defineConfig`.

If the project defines content collections, add JAAD's collection without
replacing them:

```ts
// src/content.config.ts
import { collections as jaadCollections } from '@jaamd/jaad/content'
import { defineCollection } from 'astro:content'

const blog = defineCollection({/* existing loader and schema */})

export const collections = {
    blog,
    ...jaadCollections,
}
```

The collection names `docsPages` and, with
[sections](02-pages.md#sections), `docsPages-<key>` are reserved for JAAD.

Create `docs/`, add a Markdown page, then run the project with its existing
development script.
