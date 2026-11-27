---
description: Every option of jaab.config.ts, with its type and default.
---

# Options

Every option lives in `jaab.config.ts`, at the project root. Only `title` is
required:

```ts
import { defineJaabConfig } from '@jaamd/jaab'

export default defineJaabConfig({
    title: 'My blog',
    site: 'https://example.dev',
})
```

## The blog's own

| Option                             | Type                | Default    | What it does                         |
| ---------------------------------- | ------------------- | ---------- | ------------------------------------ |
| [`blogDir`](02-blogDir.md)         | `string`            | `"./blog"` | The directory of the posts           |
| [`routeBase`](03-routeBase.md)     | `string`            | `"/"`      | Where the blog is served             |
| [`perPage`](04-perPage.md)         | `number`            | `10`       | Posts on each page of the index      |
| [`feed`](05-feed.md)               | `boolean \| object` | `true`     | The RSS feed                         |
| [`readingTime`](06-readingTime.md) | `boolean`           | `true`     | The minutes to read a post           |
| [`author`](07-author.md)           | `string`            | none       | The author of a post that names none |
| [`editLink`](08-editLink.md)       | `boolean \| string` | `true`     | The link to edit a post              |
| [`llms`](09-llms.md)               | `boolean`           | `true`     | Files for language models            |
| [`layout`](10-layout.md)           | `string`            | none       | A layout of your own                 |

## Site options

These are JAAD's, documented with it. Beside JAAD, they go in `site.config.ts`,
shared by both: see [Docs and a blog](../01-getting-started/01-installation.md#docs-and-a-blog).

| Option                                                                 | What it does                               |
| ---------------------------------------------------------------------- | ------------------------------------------ |
| [`title`](../../../jaad/docs/03-configuration/02-title.md)             | The site name                              |
| [`description`](../../../jaad/docs/03-configuration/03-description.md) | The site description                       |
| [`lang`](../../../jaad/docs/03-configuration/04-lang.md)               | The language                               |
| [`logo`](../../../jaad/docs/03-configuration/05-logo.md)               | An image in place of the site name         |
| [`homeLink`](../../../jaad/docs/03-configuration/06-homeLink.md)       | Where the site name leads                  |
| [`site`](../../../jaad/docs/03-configuration/07-site.md)               | The public URL: the feed needs it          |
| [`base`](../../../jaad/docs/03-configuration/08-base.md)               | The path the site is served below          |
| [`nav`](../../../jaad/docs/03-configuration/14-nav.md)                 | Text links in the header                   |
| [`social`](../../../jaad/docs/03-configuration/15-social.md)           | Icon links in the header                   |
| [`footer`](../../../jaad/docs/03-configuration/16-footer.md)           | The footer, with `:feed` for the feed link |
| [`authors`](../../../jaad/docs/03-configuration/18-authors.md)         | The people who write the site              |
| [`head`](../../../jaad/docs/03-configuration/20-head.md)               | Extra tags in `<head>`                     |
| [`ogImage`](../../../jaad/docs/03-configuration/21-ogImage.md)         | The social image                           |
| [`theme`](../../../jaad/docs/03-configuration/23-theme.md)             | The colours of the interface and code      |
| [`appearance`](../../../jaad/docs/03-configuration/24-appearance.md)   | Light, dark, or the reader's choice        |
| [`tailwind`](../../../jaad/docs/03-configuration/25-tailwind.md)       | Tailwind in your pages and styles          |
| [`ui`](../../../jaad/docs/03-configuration/26-ui.md)                   | The interface strings, per language        |
| [`astro`](../../../jaad/docs/03-configuration/27-astro.md)             | Astro options of your own                  |

Colours, fonts and widths are CSS custom properties in `src/jaamd.css`, as in
JAAD: see [Styles](../../../jaad/docs/02-guides/04-styles.md).
