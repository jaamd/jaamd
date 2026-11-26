---
description: Put the blog inside a site that already has a look of its own.
---

# Layout

A site with its own header, footer and style can keep them for the blog. Point
`layout` at a component of the site's:

```ts
jaab({
    title: 'Luca Pattocchio',
    theme: { light: 'rose-pine-dawn', dark: 'rose-pine' },
    routeBase: '/blog',
    layout: './src/layouts/Blog.astro',
})
```

The path is relative to the project root; a file that is not there stops the
build. JAAB still writes every page of the blog, and each one renders in the
layout: the index, its later pages, and each post.

## What the layout gets

The layout owns the whole document, `<html>` included. Its slot holds the
Markdown, already rendered: on the index, `blog/index.md`, on its first page
only; on a post, the post. Its props are the data, told apart by `kind`:

| Prop                     | On    | What it is                                             |
| ------------------------ | ----- | ------------------------------------------------------ |
| `kind`                   | both  | `'index'` or `'post'`                                  |
| `title`, `description`   | both  | the page's own, without the site's title               |
| `meta`                   | both  | the page's metadata, for `BlogMeta`                    |
| `indexHref`, `feedHref`  | both  | the index, and `rss.xml` (`null` without a feed)       |
| `posts`                  | index | the posts on this page, newest first                   |
| `page`, `pages`          | index | this page and the count, from 1                        |
| `newerHref`, `olderHref` | index | the pages either side, or `null`                       |
| `heading`, `ownHeading`  | both  | the title to write, and whether the slot opens with it |
| `post`                   | post  | the post                                               |
| `headings`               | post  | its headings, for a table of contents                  |

Each post, in `posts` or as `post`, has `title`, `description`, `href`, `day`
(as written, `2026-11-22`), `date`, `updatedDay`, `readingTime` in minutes,
`authors`, `tags`, `markdownHref`, `editHref`, and its `older` and `newer`
posts. The types are `BlogLayoutProps` and `BlogPost`, from `@jaamd/jaab/layout`.

This layout sits inside the site's own `Layout.astro`, which gives its
metadata a `head` slot:

```astro
---
import BlogMeta from '@jaamd/jaab/components/BlogMeta.astro'
import type { BlogLayoutProps } from '@jaamd/jaab/layout'
import Layout from './Layout.astro'

const props = Astro.props as BlogLayoutProps
---

<Layout>
    <Fragment slot="head">
        <title>{props.meta.head.title}</title>
        <BlogMeta {...props.meta} />
    </Fragment>

    {props.kind === 'index' ? (
        <section>
            <div class="jaamd-content">
                <slot />
            </div>
            <ol>
                {props.posts.map((post) => (
                    <li>
                        <time datetime={post.day}>{post.day}</time>
                        <a href={post.href}>{post.title}</a>
                    </li>
                ))}
            </ol>
            {props.olderHref && <a href={props.olderHref}>Older posts</a>}
        </section>
    ) : (
        <article class="jaamd-content">
            <p>
                {props.post.day} · {props.post.readingTime} min
            </p>
            {!props.ownHeading && <h1>{props.post.title}</h1>}
            <slot />
        </article>
    )}
</Layout>
```

In `Layout.astro`, a slot with fallback content keeps the site's own metadata on
every other page:

```astro
<head>
    <slot name="head">
        <title>My site</title>
        <meta name="description" content="…" />
    </slot>
</head>
```

`BlogMeta` writes what search engines, social previews and feed readers look
for: the description, the canonical URL, Open Graph and Twitter, the article's
dates and tags, its `BlogPosting` data, and the links to the feed and to the
post's Markdown. The `<title>` stays the layout's: `props.meta.head.title` holds
the whole one.

## The Markdown

JAAMD styles the Markdown inside an element with the class `jaamd-content`: put
the slot in one, as the example does. Its fonts come from `--jaamd-font-sans`
and `--jaamd-font-mono`; set them to the site's own in its stylesheet:

```css
:root {
    --jaamd-font-sans: 'Poppins', sans-serif;
    --jaamd-font-mono: 'JetBrains Mono', monospace;
}
```

## What stays JAAB's

The feed, each post's Markdown, `llms.txt`, the aliases, the sitemap and the
checks on the posts are the same as with JAAB's own layout. The Markdown keeps
JAAMD's styles in the site's `theme`.

What the layout replaces is the shell: its header, footer and styles are not
loaded, and JAAB serves no 404 of its own, leaving it to the site's.

The index is JAAB's: a page of the project's own at the blog's address stops the
build. Elsewhere, `getPosts()` lists the posts, newest first, for a page such as
the home's latest posts:

```astro
---
import { getPosts } from '@jaamd/jaab/posts'

const latest = (await getPosts()).slice(0, 3)
---
```

## JAAMD

JAAB sets up JAAMD for the Markdown: a site that adds `jaamd()` itself would load
its styles and scripts twice, so the build stops. Remove it from
`astro.config`, and give its theme to JAAB as `theme`.
