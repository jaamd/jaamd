---
description: The files JAAD writes for language models and agents, and how to serve Markdown to the agents that ask for it.
---

# LLMs and agents

An agent learning a product from its documentation reads it best as Markdown,
with links it can follow. Next to the pages, JAAD writes:

| File                            | What it holds                                                         |
| ------------------------------- | --------------------------------------------------------------------- |
| `<routeBase>/llms.txt`          | The pages, by chapter and section, each linked to its Markdown        |
| `<routeBase>/llms-full.txt`     | Every page in one file, in the order of the site                      |
| `<page>.md`                     | One page as Markdown                                                  |
| `<routeBase>/search-index.json` | The [search index](04-search.md#the-index-format), in a public format |

`llms.txt` follows the [llms.txt](https://llmstxt.org) convention: the site
title, its `description`, then the pages. Each language has its own files below
its prefix, as `/it/llms.txt`, and the default language's `llms.txt` lists them.

Set `site`: without it, the links in these files are relative, and an agent that
reads them elsewhere cannot follow them. The build warns when it is missing.

## The Markdown of a page

Each page is served at its URL plus `.md`: `/guides/setup/` at
`/guides/setup.md`. It is written to read on its own:

- it opens with the page title, then the frontmatter `description`;
- links to other pages lead to their Markdown, with the site's URL;
- code tabs become one code block per tab, each under its label;
- the table of contents is left out, and spoilers are plain text;
- alerts stay as GitHub writes them, `> [!NOTE]`.

The "Copy page" button copies the same Markdown. Each page also announces it in
its head, for the agents that look for it there:

```html
<link rel="alternate" type="text/markdown" href="/guides/setup.md" />
```

## Turning the files off

```ts
defineJaadConfig({ title: 'My Project', llms: false })
```

`llms: false` leaves out `llms.txt`, `llms-full.txt` and the announcement in the
head. The Markdown of each page stays, for the "Copy page" button. To keep a page
out of every file, make it a [draft](02-frontmatter.md).

## Markdown for the agents that ask for it

Some agents ask for Markdown at the page's own URL, with
`Accept: text/markdown`. A static host answers with HTML whatever the request
says. A host that runs code in front of the files, such as a Worker, an edge
function or a middleware, can answer with the Markdown instead.
`@jaamd/jaad/negotiation` has the pieces:

- `prefersMarkdown(request)` tells whether the request ranks Markdown above
  HTML. `*/*` alone does not.
- `markdownPathFor(pathname, openers)` gives the path of a page's Markdown, or
  `null` for a file. The opening page is served at `routeBase`, while its
  Markdown keeps its own slug: map it in `openers`, as
  `{ '/': '/introduction.md' }`.

Every answer, HTML or Markdown, needs `Vary: Accept`, so that caches keep the
two apart. On Cloudflare Workers, with the build as the Worker's assets:

```ts
// worker.ts
import { markdownPathFor, prefersMarkdown } from '@jaamd/jaad/negotiation'

const OPENERS = { '/': '/introduction.md' }

function varying(response: Response, type?: string): Response {
    const copy = new Response(response.body, response)
    if (type) copy.headers.set('Content-Type', type)
    copy.headers.append('Vary', 'Accept')
    return copy
}

export default {
    async fetch(request: Request, env: { ASSETS: Fetcher }): Promise<Response> {
        const url = new URL(request.url)
        const path = prefersMarkdown(request) ? markdownPathFor(url.pathname, OPENERS) : null

        if (path) {
            url.pathname = path
            const markdown = await env.ASSETS.fetch(new Request(url, request))
            if (markdown.ok) return varying(markdown, 'text/markdown; charset=utf-8')
        }
        return varying(await env.ASSETS.fetch(request))
    },
}
```

The pages have to reach the Worker before the assets: set `run_worker_first` in
the Wrangler configuration. On other hosts the steps are the same: when
`prefersMarkdown(request)`, rewrite the request to `markdownPathFor(...)`, serve
that file as `text/markdown`, and add `Vary: Accept` to every page.
