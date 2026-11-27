---
description: The feed, the sitemap, llms.txt and the metadata of each post.
---

# Feed and metadata

## Feed

`/rss.xml` is an RSS 2.0 feed with the last 20 posts in full, newest first:
readers keep the posts they have already fetched. [`feed`](../03-configuration/05-feed.md)
sets how many, or leaves it out. Its links and images are absolute,
each tag is a `<category>`, and each author a `<dc:creator>`: RSS's own
`<author>` takes an email address. The header and the footer of every page link it, and
each page announces it with `<link rel="alternate">`; a `footer` of your own
places the link with `:feed`.

The feed needs absolute URLs: without [`site`](../../../jaad/docs/03-configuration/07-site.md),
the build warns and writes none.

## Search engines

Each post is an Open Graph article, with its date, its update and its tags, and
carries `BlogPosting` structured data with the same image. The sitemap lists the index, its pages and
the posts, but not their aliases.

## Agents

As in JAAD, each post is served as Markdown at its address plus `.md`, and
`llms.txt` lists the posts with a link to each. Beside JAAD, the site writes the
root `llms.txt`, with a section for the docs and one for the blog.
