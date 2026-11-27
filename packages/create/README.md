<h1 align="center">@jaamd/create</h1>
<p align="center">Scaffold a site from folders of markdown: docs with <b>JAAD</b>, a blog with <b>JAAB</b>, or both. Or add one to a repository you already have.</p>

## How to use

```bash
npm create @jaamd@latest
```

It asks what you are building, then where:

| Template    | What you get                                               |
| ----------- | ---------------------------------------------------------- |
| `docs`      | A documentation site, with the docs at `/`                 |
| `site`      | A local landing page at `/`, with the docs at `/docs`      |
| `blog`      | A blog, with its posts at `/`                              |
| `docs-blog` | Docs at `/` and a blog at `/blog`, sharing one site config |

The `site` template's layout and landing page belong to the application and do
not inherit JAAD's documentation layout.

npm passes options on only after `--`; pnpm, yarn and bun need none:

```bash
npm create @jaamd@latest my-site -- --template docs-blog
pnpm create @jaamd my-site --template docs-blog
```

`npm create @jaamd/jaad` and `npm create @jaamd/jaab` are the same scaffolder,
with the templates of their package: `docs`, `site` and `docs-blog` for JAAD,
`docs` being the default; `blog` and `docs-blog` for JAAB, `blog` being the
default.

Every template also writes `AGENTS.md`, a short guide to the project for coding
agents, with `CLAUDE.md` deferring to it.

## A repository you already have

```bash
npm create @jaamd@latest -- --here --template docs
```

Adds the wiring and the dependencies, and leaves everything else alone. Your
`package.json` keeps its name, version, scripts and dependencies. If `docs/` or
`blog/` already has markdown, no sample page is written there. If a root page
already exists, the `site` template does not add a layout or landing page beside
it.

No file is overwritten. `package.json` only gains the scripts and dependencies
it lacks, keeping its order and indentation, and is left alone when it has them
all. Configuration files the scaffolder wrote before are reported as kept. If
the project has a custom `astro.config.*` or `src/content.config.*`, or one of
another template, the command stops before writing anything and points to the
manual steps: those of [JAAD](https://docs.jaamd.org/jaad/getting-started/installation#existing-astro-project),
or those of [JAAB](https://docs.jaamd.org/jaab/getting-started/installation),
which also cover adding a blog beside existing docs.

## Options

|                     |                                                 |
| ------------------- | ----------------------------------------------- |
| `[directory]`       | Create the project in this directory.           |
| `--here`            | Use the current directory instead of a new one. |
| `--template <name>` | `docs`, `site`, `blog` or `docs-blog`.          |
| `--title <title>`   | Set the site title.                             |
| `--install`         | Install dependencies after writing the files.   |
| `--no-install`      | Write the files and stop.                       |

Interactive prompts offer useful defaults: the directory is named after the
template, such as `my-docs` or `my-blog`, and the current directory, when it is
not empty, is used only once you confirm. In CI and other non-interactive
environments the rest must be provided explicitly: a directory or `--here`, a
title, and either `--install` or `--no-install`. `npm create @jaamd` also needs
`--template`; its aliases default to theirs.

## Documentation

[docs.jaamd.org](https://docs.jaamd.org)

## License

@jaamd/create is released under the [MIT License](https://github.com/jaamd/jaamd/blob/main/packages/create/LICENSE).
