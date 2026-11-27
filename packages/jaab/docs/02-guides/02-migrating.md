---
description: Bring posts over from Astro's blog template, Jekyll or Hugo.
---

# Migrating

Rename these fields in the frontmatter of each post:

| From                  | Field              | In JAAB       |
| --------------------- | ------------------ | ------------- |
| Astro's blog template | `pubDate`          | `date`        |
| Astro's blog template | `updatedDate`      | `lastUpdated` |
| Astro's blog template | `heroImage`        | `ogImage`     |
| Jekyll, Hugo          | `categories`       | `tags`        |
| Jekyll, Hugo          | `permalink`, `url` | `aliases`     |

A post keeps the address of its file name. To keep an old one, list it in
`aliases`: it redirects to the new address and stays out of the sitemap.
