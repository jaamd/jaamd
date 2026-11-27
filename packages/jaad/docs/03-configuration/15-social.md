---
description: Icon links in the header, to the repository and elsewhere.
---

# `social`

Icon links in the header, by name.

| Type                               | Default                  | Notes                          |
| ---------------------------------- | ------------------------ | ------------------------------ |
| `Record<string, string \| object>` | the repository, from git | Site option, JAAB reads it too |

## Use cases

### The repository

Leave it unset: JAAD links the git remote, with its forge's icon.

### Accounts on known sites

A URL is enough for the keys with an icon of their own: `github`, `gitlab`,
`codeberg`, `gitea`, `forgejo`, `bitbucket` and `sourcehut`.

```ts
social: {
    github: 'https://github.com/me/repo',
},
```

An entry for the forge replaces the link found in git.

### Anything else

An object gives the label and the icon, as an inline SVG:

```ts
social: {
    forum: {
        href: 'https://forum.example.dev',
        label: 'Forum',
        svg: '<svg viewBox="0 0 24 24">...</svg>',
    },
},
```

Without `svg`, a key with no icon of its own shows its label as text.

## Limits

`href` is a path or an `http(s)`, `mailto` or `tel` URL.
