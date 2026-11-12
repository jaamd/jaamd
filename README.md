<p align="center">
  <a href="https://jaamd.org">
    <img src="./.github/readme-header.png" alt="JAAMD — Just Another Astro Markdown. Markdown, finished." width="1200" />
  </a>
</p>

<p align="center">
  Markdown plugins, client-side enhancements and styles as a single <a href="https://astro.build">Astro</a> integration for Markdown content.
</p>

<div align="center">

[![main](https://github.com/jaamd/jaamd/actions/workflows/ci.yml/badge.svg)](https://github.com/jaamd/jaamd/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](/LICENSE)
[![npm version](https://badge.fury.io/js/@jaamd%2Fastro.svg)](https://badge.fury.io/js/@jaamd%2Fastro)

</div>

```bash
npx astro add @jaamd/astro
```

```astro
---
import MarkdownContent from '@jaamd/astro/components'
---

<MarkdownContent>
    <slot />
</MarkdownContent>
```

Documentation and showcase: [jaamd.org](https://jaamd.org)

## Packages

| Package                                       | What                                                           |
| --------------------------------------------- | -------------------------------------------------------------- |
| [`@jaamd/astro`](/packages/astro)             | The Astro integration: plugins, enhancements, styles, themes   |
| [`@jaamd/core`](/packages/core)               | The framework-agnostic part `@jaamd/astro` builds on           |
| [`@jaamd/jaad`](/packages/jaad)               | A documentation site from a folder of Markdown, built on jaamd |
| [`@jaamd/create-jaad`](/packages/create-jaad) | Scaffolds a jaad site: `npm create @jaamd/jaad@latest`         |

Each package keeps its tests in `tests/`, with a fixture site for the build assertions.

```bash
pnpm install
pnpm check && pnpm test
pnpm test:build      # builds each fixture and asserts on its output
pnpm test:consumer   # installs the packed tarballs into throwaway projects
```

See [CONTRIBUTING.md](/CONTRIBUTING.md) for themes and interface translations.

## License

The packages are released under the [MIT License](/LICENSE).
