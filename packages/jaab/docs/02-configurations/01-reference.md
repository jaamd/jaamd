---
description: Every option of jaab.config.ts.
---

# Configuration reference

JAAB takes the site options of JAAD, from `title` to `ui`: see
[JAAD's reference](../../../jaad/docs/02-configurations/01-reference.md). Then the
blog's own:

| Option        | Default  | Description                                                             |
| ------------- | -------- | ----------------------------------------------------------------------- |
| `blogDir`     | `./blog` | the directory of the posts                                              |
| `routeBase`   | `/`      | where the blog is served                                                |
| `perPage`     | `10`     | posts on each page of the index                                         |
| `feed`        | `true`   | `rss.xml`, the last 20 posts in full; `{ limit }` sets how many         |
| `readingTime` | `true`   | the minutes to read a post, above its title                             |
| `author`      | none     | the key in the site's `authors` of a post's author when it names none   |
| `editLink`    | `true`   | a link to edit the post, inferred from the repository, or its base      |
| `llms`        | `true`   | `llms.txt`, `llms-full.txt` and the Markdown of each post               |
| `layout`      | none     | a layout of your own, from the project root: see [Layout](04-layout.md) |

`authors`, the people who write the site, is one of the site options: see
[JAAD's Authors](../../../jaad/docs/02-configurations/01-reference.md#authors).
`author` has to be one of them.

Colours, fonts and widths are CSS custom properties in `src/jaamd.css`, as in
JAAD: see [JAAD's Styles](../../../jaad/docs/02-configurations/06-styles.md).

`site`, `base` and `astro` reach Astro as they do from `jaad.config.ts`.
