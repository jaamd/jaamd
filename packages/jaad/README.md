<p align="center">
  <a href="https://docs.jaamd.org/jaad">
    <img src="./assets/readme-header.png" alt="JAAD — Just Another Astro Docs. Documentation, simplified." width="1200" />
  </a>
</p>

<p align="center">
  An <a href="https://astro.build">Astro</a> integration that turns a folder of markdown into a documentation site.
</p>

<div align="center">

[![main](https://github.com/jaamd/jaamd/actions/workflows/ci.yml/badge.svg)](https://github.com/jaamd/jaamd/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/withastro/astro/blob/main/LICENSE)
[![npm version](https://badge.fury.io/js/@jaamd%2Fjaad.svg)](https://badge.fury.io/js/@jaamd%2Fjaad)
</div>

```bash
npm create @jaamd/jaad@latest my-docs
```

Or add it to a repository that already has a `docs/` folder:

```bash
npm create @jaamd/jaad@latest -- --here
```

By hand:

```bash
npm install @jaamd/jaad
```

```ts
// jaad.config.ts
import { defineJaadConfig } from '@jaamd/jaad'

export default defineJaadConfig({
    site: 'https://example.dev',
    title: 'My Project',
})
```

## Documentation

The documentation ships with the package, in
[`docs/`](https://github.com/jaamd/jaamd/tree/main/packages/jaad/docs): once
installed, at `node_modules/@jaamd/jaad/docs/`. Point an agent's `AGENTS.md`
there; projects made with `create-jaad` already do. It is also published at
[docs.jaamd.org/jaad](https://docs.jaamd.org/jaad).

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md), including the guide for contributing
new interface translations.

## License

jaad is released under the [MIT License](/LICENSE).
