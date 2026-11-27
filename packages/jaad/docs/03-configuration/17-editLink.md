---
description: The "Edit this page" link, from the repository or a URL of yours.
---

# `editLink`

The "Edit this page" link at the end of each page.

| Type                | Default |
| ------------------- | ------- |
| `boolean \| string` | `true`  |

## Use cases

### A repository on a known forge

Leave it unset. JAAD builds the link from the git remote and the branch
checked out, for GitHub, GitLab, Gitea, Forgejo, Codeberg and Bitbucket. A
self-hosted forge counts when its host starts with the forge's name, as
`gitlab.example.dev`.

In CI, where the checkout is often detached, the branch is the one GitHub
Actions, GitLab CI, Cloudflare Pages, Vercel or Netlify names. When neither the
remote nor the branch can be found, the link is left out.

### Another forge, or another branch

Pass the URL that edits a file. `:path` is replaced with the page's path inside
`docsDir`, or added at the end when the URL has none:

```ts
editLink: 'https://git.example.dev/me/repo/edit/main/docs/:path',
```

With [`sections`](11-sections.md), the URL applies to all of them, and `:path`
is the file's path inside its section's directory.

### No link

```ts
editLink: false,
```
