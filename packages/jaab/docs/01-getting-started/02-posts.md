---
description: Write a post: its file, its date and the fields it can set.
---

# Posts

A post is a Markdown file in `blog/`. Its address is its file name, without the
date in front if there is one: `2026-11-22-introducing-jaab.md` and
`introducing-jaab.md` are both `/introducing-jaab/`. A post with images beside
it is a directory with an `index.md`: `introducing-jaab/index.md`.

`jaab new` writes one, dated today:

```bash
npx jaab new "Introducing JAAB"
npx jaab new "Photos from the trip" --dir
```

## Frontmatter

```yaml
---
title: Introducing JAAB
date: 2026-11-22
tags: [jaab, release]
---
```

| Field         | Required | Use                                                          |
| ------------- | -------- | ------------------------------------------------------------ |
| `date`        | yes      | the order of the posts; a day, or a time with its offset     |
| `title`       | no       | otherwise the first `#` heading of the file                  |
| `description` | no       | in the index, the feed and the page's metadata               |
| `tags`        | no       | in the metadata and the feed only: never shown on the page   |
| `authors`     | no       | keys of the `authors` option; the default `author` otherwise |
| `aliases`     | no       | old addresses of the post, each redirected to it             |
| `lastUpdated` | no       | shown as "Updated" at the end of the post                    |
| `ogImage`     | no       | the image for social previews; the site's otherwise          |

Without a `description`, the index shows the text before a `<!-- more -->` line,
or else the first paragraph.

A post shows the day its `date` is written on, whatever the time and its offset:
`2026-11-23T00:30:00+01:00` is shown as Nov 23. The time orders posts of the
same day.

A link to another post's file, such as `[the move](2026-11-23-oxlint.md)`,
becomes that post's address; a link to a file that does not exist stops the
build.

Aliases are Astro redirects: the dev server restarts on its own when one changes.
JAAB does not read `draft`, and the build stops if a post sets it: keep a post
out of `blog/` until it is ready.

## The index

`blog/index.md` is the text above the list: its title heads the index, and its
description is the page's.
