# Contributing

Install [Node.js 24.12 or newer](https://nodejs.org/) and [pnpm 12](https://pnpm.io/), then:

```bash
pnpm install
```

`pnpm install` builds `@jaamd/core`, which the other packages read compiled,
and the stylesheets `@jaamd/astro` serves from it. After changing core's
sources, build again with `pnpm build`.

Before opening a pull request, run the same checks as CI:

```bash
pnpm format:check && pnpm lint && pnpm check
pnpm test
pnpm test:build      # builds each package fixture and asserts on its output
pnpm test:consumer   # installs the packed tarballs into throwaway projects
```

Each check runs per package as well, for example `pnpm --filter @jaamd/jaad test`.

## Documentation

Each package's documentation is the markdown in its `docs/` folder, published
with it: `packages/astro/docs/` for JAAMD, `packages/jaad/docs/` for JAAD. The
`docs/` project renders both as docs.jaamd.org, one section each: preview it
with `pnpm --filter docs dev`. Link between pages by file, relative to
the page you are writing, even across the two packages; the build fails on a
link to a file that does not exist.

## Themes

A theme is a directory under `packages/core/src/themes/<slug>/` plus one entry in
`packages/core/src/themes/index.ts`. Themes are welcome as pull requests.

The CSS is generated. You write a palette; the build of `@jaamd/core` writes
`index.css` and, for a single-palette theme, `dark.css` under `dist/`. The
build of `@jaamd/astro` writes a stylesheet importing each of them into its own
`dist/`. Nothing under `dist/` is committed.

### 1. Write `palette.js`

Fourteen colours per palette. A `dual` theme fills both `light` and `dark`, the
others leave one `null`.

```js
export default {
    light: null,
    dark: {
        recessed: '#21222c', // below the background: code-tab header
        base: '#282a36', // the background itself
        surface: '#44475a', // raised: code, table rows, spoilers
        overlay: '#6272a4', // borders and rules
        text: '#f8f8f2',
        bright: '#ffffff', // headings, strong

        primary: '#bd93f9',
        primaryLight: '#ff79c6',
        accent: '#8be9fd', // emphasis

        alert: { note: '#8be9fd', tip: '#50fa7b', important: '#bd93f9', warning: '#f1fa8c', caution: '#ff5555' },
    },
}
```

Most palettes document these levels already: Catppuccin has `mantle/base/surface0/
overlay0/text`, Gruvbox the `bg0_h/bg0/bg1/bg2`, Rosé Pine `base/surface/muted`,
Tokyo Night `bg_dark/bg/bg_highlight/comment`.

Where a palette wants a token off the recipe, add it under `overrides`:

```js
    overrides: { "blockquote-fg": "#6272a4" },
```

### 2. Declare it

Add an entry to `packages/core/src/themes/index.ts` with the directory name as `slug` and a
readable `name`, plus:

| `mode`               | The palette is                        | `shiki`           |
| -------------------- | ------------------------------------- | ----------------- |
| `"light"` / `"dark"` | one palette, applying in both modes   | one theme name    |
| `"dual"`             | two palettes, `:root` and `html.dark` | `{ light, dark }` |

### 3. Generate and check

```bash
pnpm build
pnpm --filter @jaamd/core --filter @jaamd/astro test
```

The test names the missing level, an unknown Shiki theme, or a token no other
theme lacks.

## Translating the interface

JAAD bundles its own interface strings separately from the Markdown written by
its users. English is the canonical catalogue; every other catalogue must
contain exactly the same keys.

To contribute another language:

1. Copy `packages/jaad/contributing/ui-locale.template.ts` to
   `packages/jaad/src/ui/<language>.ts`, using a lowercase ISO 639-1 language
   code for the filename.
2. Rename `UI_LOCALE` to a language-specific constant and translate every
   value. Do not leave empty strings.
3. Import the catalogue in `packages/jaad/src/ui.ts` and add its language code
   to `UI_CATALOGS`.
4. Add the catalogue to the completeness test in `packages/jaad/tests/unit/ui.test.ts` and
   update the supported-language list in
   `packages/jaad/docs/04-configurations/10-i18n.md`.
5. Run the checks above.

Translate meaning rather than individual words. Keep labels concise, preserve
punctuation where it carries meaning, and remember that keys such as
`breadcrumb.label`, `nav.*`, `search.label`, and `theme.toggle` are also read
by assistive technology. Keyboard hints such as `search.open` and
`search.navigate` should remain short verbs.

Regional locales automatically inherit their base language. A catalogue for
`pt`, for example, also supplies the defaults for `pt-BR`; users can still
override either locale through their JAAD configuration.

## Releasing

Each package is released on its own, from a clean `main`:

```bash
node scripts/release.mjs jaamd 0.12.0
git push origin HEAD jaamd@0.12.0
```

The script sets the version, commits, and creates the `<package>@<version>` tag; the
tag runs [`publish.yml`](/.github/workflows/publish.yml), which tests the whole
workspace and publishes with provenance. Releasing `jaad` also updates the version
`create-jaad` installs, so release `create-jaad` after it. When jaad needs a new
jaamd, release jaamd first.
