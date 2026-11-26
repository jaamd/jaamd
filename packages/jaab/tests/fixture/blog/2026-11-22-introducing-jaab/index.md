---
title: Introducing JAAB
date: 2026-11-22
lastUpdated: 2026-11-24
tags: [jaab, release]
aliases: [/posts/introducing-jaab/]
---

JAAB is a blog for Astro, on the same shell as JAAD.

<!-- more -->

It reads a folder of Markdown and writes the index, the feed and the sitemap.

![The index of a blog](./index.png)

## Three ways in

### A blog on its own

Add the integration and a folder of posts.

```js
import jaab from '@jaamd/jaab'
```

## What a post needs

A title and a date.
