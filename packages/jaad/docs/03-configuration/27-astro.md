---
description: Astro options of your own, beside JAAD's.
---

# `astro`

Astro options, passed on to `defineConfig` by `@jaamd/jaad/site`.

| Type              | Default |
| ----------------- | ------- |
| `AstroUserConfig` | `{}`    |

## Use cases

### Another integration

```ts
astro: {
    integrations: [mdx()],
},
```

Integrations of yours come after JAAD's.

### Fonts of your own

```ts
astro: {
    fonts: [{ provider: fontProviders.google(), name: 'IBM Plex Sans', cssVariable: '--font-plex' }],
},
```

Then point a token at the variable: see [Styles](../02-guides/04-styles.md#fonts).

### Page URLs without a trailing slash

```ts
astro: {
    build: { format: 'file' },
},
```

JAAD's links follow Astro's `trailingSlash` and `build.format`.

## Limits

`astro` is read by `@jaamd/jaad/site`. In an `astro.config` of your own, with
`jaad(config)` among its integrations, only `astro.fonts` is read, to load
those fonts on JAAD's pages: write the other options, and the same fonts, in
`defineConfig`. See
[Installation](../01-getting-started/01-installation.md#existing-astro-project).
