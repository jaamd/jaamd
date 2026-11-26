# JAAB

**Just Another Astro Blog**. _Blogging, refined._

An [Astro](https://astro.build) integration that turns a folder of markdown into a blog: an index, a page for each post, an RSS feed and a sitemap, on the same shell as [JAAD](https://docs.jaamd.org/jaad).

Install it with Astro and write three files:

```bash
npm install astro @jaamd/jaab
```

```ts
// jaab.config.ts
import { defineJaabConfig } from '@jaamd/jaab'

export default defineJaabConfig({
    site: 'https://example.dev',
    title: 'My Blog',
})
```

```js
// astro.config.mjs
export { default } from '@jaamd/jaab/site'
```

```ts
// src/content.config.ts
export { collections } from '@jaamd/jaab/content'
```

Then write a post:

```bash
npx jaab new "Hello"
```

A site with docs and a blog installs JAAD too: see
[Installation](https://github.com/jaamd/jaamd/tree/main/packages/jaab/docs/01-getting-started/01-installation.md#docs-and-a-blog).

## Documentation

The documentation ships with the package, in
[`docs/`](https://github.com/jaamd/jaamd/tree/main/packages/jaab/docs): once
installed, at `node_modules/@jaamd/jaab/docs/`.

## License

[MIT](./LICENSE)
