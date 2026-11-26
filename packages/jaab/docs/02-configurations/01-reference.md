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
| `author`      | none     | the key in `authors` of whoever writes a post that names no one         |
| `authors`     | `{}`     | key → `{ name, url? }`; with more than one, each post names its own     |
| `editLink`    | `true`   | a link to edit the post, inferred from the repository, or its base      |
| `llms`        | `true`   | `llms.txt`, `llms-full.txt` and the Markdown of each post               |
| `layout`      | none     | a layout of your own, from the project root: see [Layout](04-layout.md) |

`site`, `base` and `astro` reach Astro as they do from `jaad.config.ts`.
