# Installation

## Create a project

:::code-tabs

```bash npm
npm create @jaamd/jaad@latest
```

```bash pnpm
pnpm create @jaamd/jaad@latest
```

```bash yarn
yarn create @jaamd/jaad@latest
```

```bash bun
bun create @jaamd/jaad@latest
```

:::

The CLI asks for a destination, template, title and whether to install
dependencies. The `docs` template puts documentation at `/` and is the default;
`site` adds a landing page at `/` and moves documentation to `/docs`.

To provide every answer as flags:

:::code-tabs

```bash npm
npm create @jaamd/jaad@latest my-docs -- --title "My Docs" --install
```

```bash pnpm
pnpm create @jaamd/jaad@latest my-docs --title "My Docs" --install
```

```bash yarn
yarn create @jaamd/jaad@latest my-docs --title "My Docs" --install
```

```bash bun
bun create @jaamd/jaad@latest my-docs --title "My Docs" --install
```

:::

Use `--here` inside an existing repository:

:::code-tabs

```bash npm
npm create @jaamd/jaad@latest -- --here
```

```bash pnpm
pnpm create @jaamd/jaad@latest --here
```

```bash yarn
yarn create @jaamd/jaad@latest --here
```

```bash bun
bun create @jaamd/jaad@latest --here
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
[Creating pages](/docs/jaad/getting-started/creating-pages).

## Manual installation

Install JAAD in an Astro 7 project running Node.js 22.12 or later:

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
[configuration reference](/docs/jaad/configurations/reference) for the remaining
options.

## Existing Astro project

If `--here` reports custom `astro.config.*` or `src/content.config.*` files,
keep their existing configuration and merge JAAD manually.

Add the integration to the Astro configuration:

```ts
import jaad from '@jaamd/jaad'
// astro.config.ts
import { defineConfig } from 'astro/config'
import jaadConfig from './jaad.config'

export default defineConfig({
    site: jaadConfig.site,
    base: jaadConfig.base,
    integrations: [jaad(jaadConfig)],
})
```

`jaad()` returns integrations only. `site` and `base` are lifted above, and the
[`astro`](/docs/jaad/configurations/reference#extending-astro) field is ignored here.
Write those options in `defineConfig`.

If the project defines content collections, add JAAD's collection without
replacing them:

```ts
import { collections as jaadCollections } from '@jaamd/jaad/content'
// src/content.config.ts
import { defineCollection } from 'astro:content'

const blog = defineCollection({/* existing loader and schema */})

export const collections = {
    blog,
    ...jaadCollections,
}
```

The collection name `docsPages` is reserved for JAAD.

Create `docs/`, add a Markdown page, then run the project with its existing
development script.
