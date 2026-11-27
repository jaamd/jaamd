---
description: Every frontmatter field JAAD reads, and what each one changes.
keywords: [frontmatter, metadata, seo]
---

# Frontmatter

Frontmatter is optional. Markdown without it works as-is: the filename sets the
order and the URL, and the first `# Heading` sets the title. Each field below
overrides something the file tree or the body already supplies.

```markdown
---
title: Images & Videos
label: Media
translationKey: media
description: Add accessible images and embedded videos.
keywords: [markdown, media]
order: 5
authors: [ada, Grace Hopper]
ogImage: /og/media.png
lastUpdated: 2026-09-12
---

# Images and videos
```

| Field            | Type              | Effect                                       |
| ---------------- | ----------------- | -------------------------------------------- |
| `title`          | `string`          | Page title, everywhere the page is named     |
| `label`          | `string`          | Shorter name, in navigation only             |
| `translationKey` | `string`          | Pairs this page with its translations        |
| `description`    | `string`          | Description metadata and `llms.txt`          |
| `order`          | `number`          | Replaces the number from the filename prefix |
| `keywords`       | `string[]`        | Keyword metadata, and weight in search       |
| `authors`        | see below         | Who wrote the page, above its title          |
| `ogImage`        | `string \| false` | Social image for this page                   |
| `lastUpdated`    | `date`            | Modification date, shown under the page      |

Fields JAAD does not know are ignored, so frontmatter your own tooling
reads can sit alongside these. A wrong type is a build error.

## Naming

`title` names the page in metadata, breadcrumbs, search, and the sidebar unless
`label` is set. The filename still determines the URL, whatever the title says.

`label` is for pages whose title is too long for a sidebar entry. It changes
the sidebar, the mobile selectors and the previous/next links, and nothing
else:

```markdown
---
title: Frequently Asked Questions
label: FAQ
---
```

Without `title`, JAAD uses the first `# Heading`, then the filename.

`translationKey` pairs a page with its translations when their slugs differ.
See [Languages](03-i18n.md).

## Ordering

`order` replaces the number a filename prefix supplies, so a page can move
without being renamed. Inside a chapter it moves the page within that chapter;
the chapter keeps the order of its own directory prefix.

```markdown
---
order: 0
---
```

A page ordered ahead of every other becomes the opening page at `routeBase`.

There are no drafts: a page in the docs is published. Keep a page that is not
ready outside them, or on a branch.

## Metadata

`description` is used for the description metadata, Open Graph, structured
data, `llms.txt` and the top of the page's Markdown. Without it, the metadata
use the first paragraph of the page, then the site description; `llms.txt` uses
the first paragraph alone.

`keywords` become `<meta name="keywords">` and the `keywords` of the page's
structured data, and they rank a page in search below its title and above its
chapter and body. They are metadata, not a visible list: JAAD renders nothing for
them, though a frame of your own can, through
[`page.data`](08-advanced-layout.md).

`ogImage` overrides the site's social image for one page, in Open Graph and in
structured data. It takes a public path or an absolute URL, and `false` removes
the image from that page. Local paths need `site` to resolve, as elsewhere.

`lastUpdated` takes a date. It becomes `article:modified_time` and
`dateModified` in structured data, and is shown under the page, formatted for
its language.

## Authors

`authors` names who wrote the page: one author or a list. Each is a key of the
site's [`authors`](01-reference.md#authors), a name, or a name with a link:

```markdown
---
authors: [ada, Grace Hopper, { name: Charles Babbage, url: https://example.dev/charles }]
---
```

The names are shown above the title, joined as the page's language joins
them, "Ada Lovelace, Grace Hopper and Charles Babbage"; each with a url is a
link. Each author is also a `<meta name="author">`, a `<link rel="author">`
when it has a url, and a `Person` of the structured data.

Without `authors`, the page has the docs' default [`author`](01-reference.md#authors),
when there is one; `authors: []` names nobody, even then. The older `author`,
a single name, still works where `authors` is not set.
