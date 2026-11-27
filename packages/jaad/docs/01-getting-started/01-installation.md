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

To give every answer as an option, or to set up the current directory with
`--here`:

```bash
npm create @jaamd@latest my-docs -- --template docs --title "My Docs" --install
npm create @jaamd@latest -- --here --template docs
```

npm passes the options on after `--`; pnpm, yarn and bun need no `--`. Without
a terminal, as in CI, the command needs a directory or `--here`, `--title`, and
`--install` or `--no-install`.

`--here` keeps the existing `package.json` and Markdown files. It writes nothing
when the project's Astro or content configuration has to be merged by hand:
see [Existing Astro project](#existing-astro-project).

## Run locally

```bash
npm run dev
```

The development server starts at `http://localhost:4321`. Add pages to
`docs/`, following [Pages and structure](02-pages.md).

## Manual installation

Install JAAD in a project on Astro 7, from 7.3, with Node.js 22.23.4 or later:

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

Only `title` is required. Every other option is in
[Options](../03-configuration/01-options.md).

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
[`astro`](../03-configuration/27-astro.md) field, only
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
[sections](../03-configuration/11-sections.md), `docsPages-<key>` are reserved for JAAD.

Create `docs/`, add a Markdown page, then run the project with its existing
development script.
