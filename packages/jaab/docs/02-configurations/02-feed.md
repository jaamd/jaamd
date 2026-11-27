---
description: The feed, the sitemap, llms.txt and the metadata of each post.
---

# Feed and metadata

## Feed

`/rss.xml` is an RSS 2.0 feed with the last 20 posts in full, newest first:
readers keep the posts they have already fetched. `feed: { limit: 50 }` sets how
many, `feed: false` leaves the feed out. Its links and images are absolute,
each tag is a `<category>`, and each author a `<dc:creator>`: RSS's own
`<author>` takes an email address. The header and the footer of every page link it, and
each page announces it with `<link rel="alternate">`; a `footer` of your own
places the link with `:feed`.

The feed needs absolute URLs: without `site`, the build warns and writes none.

## Search engines

Each post is an Open Graph article, with its date, its update and its tags, and
carries `BlogPosting` structured data with the same image. The sitemap lists the index, its pages and
the posts, but not their aliases, which are Astro redirects: a 301 on the hosts
whose adapter writes them, a page that redirects elsewhere.

## Agents

As in JAAD, each post is served as Markdown at its address plus `.md`, and
`llms.txt` lists the posts with a link to each. Beside JAAD, the site writes the
root `llms.txt`, with a section for the docs and one for the blog.
