---
description: Every option of jaad.config.ts, with its type and default.
---

# Options

Every option lives in `jaad.config.ts`, at the project root. Only `title` is
required:

```ts
import { defineJaadConfig } from '@jaamd/jaad'

export default defineJaadConfig({
    title: 'My Project',
    site: 'https://example.dev',
})
```

Site options, marked _site_, are read by [JAAB](https://docs.jaamd.org/jaab)
too: a project with docs and a blog writes them once, in `site.config.ts`.

| Option                             | Type                | Default        | What it does                                 |
| ---------------------------------- | ------------------- | -------------- | -------------------------------------------- |
| [`title`](02-title.md)             | `string`            | required       | _site_ The site name                         |
| [`description`](03-description.md) | `string`            | `package.json` | _site_ The site description                  |
| [`lang`](04-lang.md)               | `string`            | `"en"`         | _site_ The language, the default one if many |
| [`logo`](05-logo.md)               | `string`            | none           | _site_ An image in place of the site name    |
| [`homeLink`](06-homeLink.md)       | `string`            | `"/"`          | _site_ Where the site name leads             |
| [`site`](07-site.md)               | `string`            | none           | The public URL                               |
| [`base`](08-base.md)               | `string`            | none           | The path the site is served below            |
| [`docsDir`](09-docsDir.md)         | `string`            | `"./docs"`     | The directory of the pages                   |
| [`routeBase`](10-routeBase.md)     | `string`            | `"/"`          | Where the docs are served                    |
| [`sections`](11-sections.md)       | `object`            | none           | One directory per part of the docs           |
| [`locales`](12-locales.md)         | `string[] \| false` | detected       | The language directories                     |
| [`readingTime`](13-readingTime.md) | `boolean`           | `false`        | The minutes to read a page                   |
| [`nav`](14-nav.md)                 | `object[]`          | `[]`           | _site_ Text links in the header              |
| [`social`](15-social.md)           | `object`            | from git       | _site_ Icon links in the header              |
| [`footer`](16-footer.md)           | `string \| false`   | `":credit"`    | _site_ The footer                            |
| [`editLink`](17-editLink.md)       | `boolean \| string` | `true`         | The "Edit this page" link                    |
| [`authors`](18-authors.md)         | `object`            | `{}`           | _site_ The people who write the site         |
| [`author`](19-author.md)           | `string`            | none           | The author of a page that names none         |
| [`head`](20-head.md)               | `object[]`          | `[]`           | _site_ Extra tags in `<head>`                |
| [`ogImage`](21-ogImage.md)         | `string \| false`   | detected       | _site_ The social image                      |
| [`llms`](22-llms.md)               | `boolean`           | `true`         | Files for language models                    |
| [`theme`](23-theme.md)             | `string \| object`  | `"default"`    | _site_ The colours of the interface and code |
| [`appearance`](24-appearance.md)   | `string`            | `"auto"`       | _site_ Light, dark, or the reader's choice   |
| [`tailwind`](25-tailwind.md)       | `boolean`           | `false`        | _site_ Tailwind in your pages and styles     |
| [`ui`](26-ui.md)                   | `object`            | `{}`           | _site_ The interface strings, per language   |
| [`astro`](27-astro.md)             | `object`            | `{}`           | Astro options of your own                    |

## Found in the project

Some values need no option. JAAD reads them from the project:

| Value                        | Read from                                         |
| ---------------------------- | ------------------------------------------------- |
| Repository and edit links    | the git remote and the branch                     |
| Description, when not set    | `package.json`                                    |
| Favicon                      | `public/favicon.svg`, `.ico` or `.png`            |
| Social image, when not set   | `public/og-image.png`, `.jpg`, `.jpeg` or `.webp` |
| Styles of your own           | `src/jaamd.css`                                   |
| Languages                    | the directory names under `docsDir`               |
| Trailing slash of page links | Astro's `trailingSlash` and `build.format`        |

## Errors

An unknown key stops the build at any depth, and names its path: a misspelt
`attributes` in a `head` entry is caught like a misspelt `titel`. Links in
`nav`, `social` and `homeLink` are paths or `http(s)`, `mailto` and `tel` URLs.
