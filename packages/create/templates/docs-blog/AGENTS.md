# Repository guide

Documentation and a blog in one site. The documentation is built with
[JAAD](https://docs.jaamd.org/jaad), which turns the `docs/` folder into pages
at `/`; the blog with [JAAB](https://docs.jaamd.org/jaab), which turns the
`blog/` folder into posts at `/blog`. They share the header, the footer, the
theme and the fonts. There are no page components to write: a markdown file is
a page, or a post.

## Development

Start the dev server in background mode:

```
astro dev --background
```

Manage it with `astro dev stop`, `astro dev status` and `astro dev logs`.
Build the site with `astro build`.

## Layout

| Path                    | What it is                                                 |
| ----------------------- | ---------------------------------------------------------- |
| `docs/`                 | The markdown of the documentation                          |
| `blog/`                 | The posts, and `index.md` above their list                 |
| `site.config.ts`        | The options both share: title, navigation, footer, theme   |
| `astro.config.mjs`      | Each package with its own options, and Astro's, as `site`  |
| `src/content.config.ts` | JAAD's and JAAB's collections together; leave it alone     |
| `src/jaamd.css`         | Colours, fonts and widths (create it if absent)            |

The options of one package go in its call in `astro.config.mjs`, after the
shared ones: `jaad({ ...site, routeBase: "/" })`. The build stops when the two
set a site option differently, or when a page of one would be served inside
the other. Search stays on the docs; `/llms.txt` has a section for each.

The stylesheets are precompiled: installing them does not bring Tailwind into
this project. `src/pages/` is for pages of your own, which keep their own
layout.

## Writing pages

- A numeric prefix sets the order and is stripped from the URL:
  `02-guide.md` becomes `/guide/`.
- A folder becomes a chapter. Only one level of nesting is supported,
  per language.
- Link to another page by its file, relative to the one you are writing:
  `[Setup](./02-guides/01-setup.md)`. JAAD turns it into the page's URL.
- The first `# Heading` is the page title; `##` and `###` build the table of
  contents.
- The first page in sort order opens at `/`, and its named URL redirects there.

## Writing posts

- `npx jaab new "Title of the post"` writes `blog/title-of-the-post.md`, dated
  today. `--dir` makes a directory with an `index.md`, for images beside it.
- The file name is the address: `hello-world.md` is `/blog/hello-world/`. A
  date in front, as in `2026-11-22-hello-world.md`, is left out of it.
- A post is published when it is in `blog/`: there are no drafts. Keep a post
  elsewhere until it is ready.
- `date` is the only field a post needs. `title`, `description`, `tags`,
  `authors`, `aliases`, `lastUpdated` and `ogImage` are optional.
- `blog/index.md` is the text above the list: its title heads the index.

`/blog/rss.xml` carries the newest posts in full, and needs absolute URLs:
until `site` is set in `astro.config.mjs`, such as `site: "https://example.com"`
beside `integrations`, the build warns and writes no feed.

## Documentation

The guides are installed with the packages, in `node_modules/@jaamd/jaad/docs/`
and `node_modules/@jaamd/jaab/docs/`. Read the one for a task before working on
it:

- Pages, links and sections: `node_modules/@jaamd/jaad/docs/01-getting-started/02-pages.md`
- Frontmatter of a page: `node_modules/@jaamd/jaad/docs/02-configurations/02-frontmatter.md`
- Posts and their frontmatter: `node_modules/@jaamd/jaab/docs/01-getting-started/02-posts.md`
- Docs and a blog together: `node_modules/@jaamd/jaab/docs/01-getting-started/01-installation.md`
- Markdown syntax: https://docs.jaamd.org/jaamd/markdown.md
- JAAD's options: `node_modules/@jaamd/jaad/docs/02-configurations/01-reference.md`
- JAAB's options: `node_modules/@jaamd/jaab/docs/02-configurations/01-reference.md`
- Feed and metadata: `node_modules/@jaamd/jaab/docs/02-configurations/02-feed.md`
- Search: `node_modules/@jaamd/jaad/docs/02-configurations/04-search.md`
- Styles and fonts: `node_modules/@jaamd/jaad/docs/02-configurations/06-styles.md`
- Themes: `node_modules/@jaamd/jaad/docs/02-configurations/05-themes.md`
- Deployment: `node_modules/@jaamd/jaad/docs/01-getting-started/03-deployment.md`

The same pages are published at https://docs.jaamd.org.
