# Overview

JAAD is an Astro integration that turns a folder of Markdown files into a
documentation site. It provides navigation, search, theming and static output
without requiring a sidebar or route configuration.

Create a documentation-only project:

:::code-tabs

```bash npm
npm create @jaamd/jaad@latest my-docs
```

```bash pnpm
pnpm create @jaamd/jaad@latest my-docs
```

```bash yarn
yarn create @jaamd/jaad@latest my-docs
```

```bash bun
bun create @jaamd/jaad@latest my-docs
```

:::

Or add JAAD to a repository that already has documentation:

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

Markdown files live in `docs/`. Numeric prefixes control their order and are
removed from generated URLs:

```
docs/
  01-introduction.md
  02-guides/
    01-setup.md
```

Continue with [Installation](02-getting-started/01-installation.md), learn how to
[create pages](02-getting-started/03-creating-pages.md), or open the
[configuration reference](04-configurations/01-reference.md).
