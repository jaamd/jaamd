---
description: The public URL of the site, for every link that has to be absolute.
---

# `site`

The URL the site is published at. It is Astro's own option: it can be set here
or in `astro.config`, and counts either way.

| Type     | Default |
| -------- | ------- |
| `string` | none    |

```ts
site: 'https://docs.example.dev',
```

Set it as soon as the address is known. Without it, the build warns and leaves
out what needs an absolute URL:

- the canonical link and the `hreflang` links of each page;
- the sitemap;
- the social image of a local file;
- absolute links in `llms.txt`, `llms-full.txt` and the Markdown of each page,
  which an agent reading them elsewhere cannot follow otherwise.

## Use cases

### A site below a path

Set the host in `site` and the path in [`base`](08-base.md):

```ts
site: 'https://me.github.io',
base: '/my-repo',
```
