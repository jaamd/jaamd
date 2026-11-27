---
description: Every option of jaad.config.ts, and the values JAAD detects from the project.
---

# Configuration

All JAAD options live in `jaad.config.ts`. Only `title` is required.
`@jaamd/jaad/site` looks for it in the directory Astro runs from, so run Astro
from the project root.

```ts
import { defineJaadConfig } from '@jaamd/jaad'

export default defineJaadConfig({
    site: 'https://example.dev',
    title: 'My Project',
})
```

These options apply only to documentation pages. Pages in `src/pages/` keep
their own layout, styles and metadata.

## Site

| Option | Type     | Default | Description                                         |
| ------ | -------- | ------- | --------------------------------------------------- |
| `site` | `string` | none    | Public URL used for canonical links and the sitemap |
| `base` | `string` | none    | Subpath when the site is not served from `/`        |

## Identity

| Option        | Type     | Default        | Description                                          |
| ------------- | -------- | -------------- | ---------------------------------------------------- |
| `title`       | `string` | none           | **Required.** Site name and metadata                 |
| `description` | `string` | `package.json` | Site description                                     |
| `lang`        | `string` | `"en"`         | Language tag, as `pt-BR`; the default when localised |
| `logo`        | `string` | none           | Public path or URL shown instead of the site name    |
| `homeLink`    | `string` | `"/"`          | Where the site name in the header leads              |

A source file path passed to `logo` produces a build error. Use a public path
such as `/logo.svg`.

When the documentation is part of a larger site, point `homeLink` at that
site's home: `homeLink: "https://example.dev"`. A path such as `/` gets
Astro's `base`.

## Content

| Option        | Type                | Default    | Description                                 |
| ------------- | ------------------- | ---------- | ------------------------------------------- |
| `docsDir`     | `string`            | `"./docs"` | Directory containing Markdown files         |
| `routeBase`   | `string`            | `"/"`      | Route where documentation is mounted        |
| `sections`    | `object`            | none       | One directory per section, by URL segment   |
| `locales`     | `string[] \| false` | detected   | Override the detected locale directories    |
| `ui`          | `object`            | `{}`       | Interface string overrides, per locale      |
| `readingTime` | `boolean`           | `false`    | The minutes to read a page, above its title |

Locale directories under `docsDir` are detected on their own; `locales` only
overrides that. See [Languages](03-i18n.md).

With `sections`, `docsDir` is read only when set, for pages outside every
section. See [Sections](../01-getting-started/02-pages.md#sections).

To keep a landing page at `/`, mount documentation below it with
`routeBase: '/docs'`; see [Custom pages](07-custom-pages.md).

`readingTime: true` shows, above each page's title and after its authors, the
minutes to read it, at 200 words a minute. A [frame of your own](08-advanced-layout.md)
gets them as `page.readingTime` either way.

## Navigation

| Option   | Type                                | Default  | Description       |
| -------- | ----------------------------------- | -------- | ----------------- |
| `nav`    | `{ label: string; href: string }[]` | `[]`     | Header text links |
| `social` | `Record<string, string \| object>`  | inferred | Header icon links |

For example:

```ts
defineJaadConfig({
    title: 'My Project',
    nav: [{ label: 'API', href: 'https://api.example.dev' }],
    social: {
        github: 'https://github.com/me/repo',
        forum: {
            href: 'https://forum.example.dev',
            label: 'Forum',
            svg: `<svg viewBox="0 0 24 24">...</svg>`,
        },
    },
})
```

Bundled forge icons are available for `github`, `gitlab`, `codeberg`, `gitea`,
`forgejo`, `bitbucket` and `sourcehut`. Any other key shows its `svg`, or else
its label as text.

Object entries accept `href`, with optional `label` and `svg` fields.

When `social` is omitted, JAAD derives the repository link and forge icon from
the git remote. An explicit forge entry overrides that inference.

## Footer

| Option   | Type              | Default   | Description                          |
| -------- | ----------------- | --------- | ------------------------------------ |
| `footer` | `string \| false` | `:credit` | Footer HTML, or `false` to remove it |

Use `:credit` to place the JAAD credit inside custom text, and `:feed` for
the link to the site's feed, when a package such as JAAB writes one:

```ts
defineJaadConfig({ title: '...', footer: '© 2026 Me · :credit · :feed' })
```

Unset, the footer is the credit, followed by the feed link when there is one.

## Repository

| Option     | Type                | Default | Description                                     |
| ---------- | ------------------- | ------- | ----------------------------------------------- |
| `editLink` | `boolean \| string` | `true`  | Derive, override or hide “Edit this page” links |

Pass a URL to override the inferred repository. `:path` is replaced with the
source file path, or appended when absent:

```ts
defineJaadConfig({
    title: '...',
    editLink: 'https://git.example.dev/me/repo/edit/main/docs/:path',
})
```

The inferred link follows the editor URLs of GitHub, GitLab, Gitea, Forgejo,
Codeberg and Bitbucket, self-hosted ones included when their host begins with
the forge's name, as `gitlab.example.dev`. Elsewhere, pass a URL.

The branch is the one checked out. On a detached checkout, as in many CI
builds, it is the branch GitHub Actions, GitLab CI, Cloudflare Pages, Vercel or
Netlify names. The link is omitted when the git remote or the branch cannot be
resolved.

With [sections](../01-getting-started/02-pages.md#sections), each one links
to its own directory. A URL passed here applies to all of them, and `:path` is
the file's path inside its section's directory.

## Authors

| Option    | Type                             | Default | Description                                   |
| --------- | -------------------------------- | ------- | --------------------------------------------- |
| `authors` | `Record<string, { name; url? }>` | `{}`    | The people who write the site, by key         |
| `author`  | `string`                         | none    | The key of a page's author when it names none |

A page names its authors in its [frontmatter](02-frontmatter.md#authors), by
these keys or by name. `authors` is a site option: beside JAAB, the docs and
the blog share it through `defineSiteConfig`. `author` is the docs' own, and
has to be one of `authors`:

```ts
defineJaadConfig({
    title: '...',
    authors: {
        ada: { name: 'Ada Lovelace', url: 'https://example.dev/ada' },
        grace: { name: 'Grace Hopper' },
    },
    author: 'ada',
})
```

## SEO and head tags

| Option    | Type              | Default          | Description                       |
| --------- | ----------------- | ---------------- | --------------------------------- |
| `head`    | `object[]`        | `[]`             | Extra elements in `<head>`        |
| `ogImage` | `string \| false` | detected or none | Social image path, URL or `false` |
| `llms`    | `boolean`         | `true`           | Files for language models         |

Without `ogImage`, JAAD uses the first of `public/og-image.png`, `.jpg`, `.jpeg`
or `.webp`. Local images and canonical URLs require `site`; absolute image URLs
do not. For `llms`, see [LLMs and agents](09-llms.md).

Each `head` entry accepts `tag`, optional `attrs`, and optional `content`. Use
it for analytics, verification tags and preconnects:

```ts
defineJaadConfig({
    title: '...',
    head: [
        { tag: 'meta', attrs: { name: 'robots', content: 'index,follow' } },
        { tag: 'script', attrs: { src: '/analytics.js', defer: true } },
    ],
})
```

## Theme and appearance

| Option       | Type                                        | Default     |
| ------------ | ------------------------------------------- | ----------- |
| `theme`      | `string \| { light: string; dark: string }` | `"default"` |
| `appearance` | `"auto" \| "light" \| "dark"`               | `"auto"`    |
| `tailwind`   | `boolean`                                   | `false`     |

A named theme styles the interface, Markdown and code blocks; a `{ light, dark }`
object changes only the code themes. `"light"` and `"dark"` pin the appearance
and remove the switcher. See [Themes](05-themes.md), and
[Styles](06-styles.md#tailwind) for `tailwind`.

## Detected project values

| Value                                 | Source                                            |
| ------------------------------------- | ------------------------------------------------- |
| Repository and edit links             | git remote, branch and `docsDir`                  |
| Missing description                   | `package.json`                                    |
| Favicon                               | `public/favicon.svg`, `.ico` or `.png`            |
| Social image                          | `public/og-image.png`, `.jpg`, `.jpeg` or `.webp` |
| Custom styles                         | `src/jaad.css`                                    |
| Locales                               | Directory names under `docsDir`                   |
| Sitemap                               | Generated when `site` is set                      |
| Search index, `llms.txt` and Markdown | Generated below `routeBase`                       |
| Trailing slash of page links          | Astro's `trailingSlash` and `build.format`        |

`public/` and `src/` are Astro's `publicDir` and `srcDir`, and every path is
read from the project's `root`, so `astro build --root` and custom directories
are followed. `site` counts wherever it is set, in the JAAD config or in
Astro's.

Page links end with a slash when Astro builds them so: with
`trailingSlash: 'always'`, or with the default `'ignore'` while pages are
directories, as `build.format: 'directory'` makes them. Links then match the
canonical URL and the sitemap, and need no redirect.

Unknown keys are refused at every level, not only at the top: a misspelt
`attributes` in a `head` entry or a `search.placeholer` in `ui` stops the build
and names its path. Links in `nav`, `social` and `homeLink` are paths or
`http(s)`, `mailto` and `tel` URLs.

## Extending Astro

| Option  | Type              | Default |
| ------- | ----------------- | ------- |
| `astro` | `AstroUserConfig` | `{}`    |

Pass additional Astro options through `astro`. Extra integrations are appended
to JAAD's integrations:

```ts
defineJaadConfig({
    title: 'My Project',
    astro: {
        build: { format: 'file' },
        integrations: [mdx()],
    },
})
```

`astro` is read by `@jaamd/jaad/site`. `jaad(config)` reads only `astro.fonts`,
to load those fonts on its pages: declare the same fonts in your own
`defineConfig`.

For full control, use a regular Astro configuration and add `jaad(config)` to
its integrations, as shown in
[Existing Astro project](../01-getting-started/01-installation.md#existing-astro-project).
