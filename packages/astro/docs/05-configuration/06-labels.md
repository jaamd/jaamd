---
description: The text JAAMD writes into the page, for another language.
---

# `labels`

The text JAAMD writes into the page, in English by default.

| Type                     | Default |
| ------------------------ | ------- |
| `Record<string, string>` | English |

| Label           | Default                                           |
| --------------- | ------------------------------------------------- |
| `headingLink`   | `Link to section`, followed by the heading        |
| `toc`           | `Table of contents`, for a `:::toc` without title |
| `copy`          | `Copy code`                                       |
| `copied`        | `Code copied to clipboard`                        |
| `copySelected`  | `Code selected: copy it with your keyboard`       |
| `lightbox`      | `Image preview`                                   |
| `lightboxOpen`  | `Enlarge image`, followed by the alt text         |
| `lightboxClose` | `Close image preview`                             |
| `spoiler`       | `Spoiler`                                         |

## Use cases

### A site in another language

```ts
jaamd({ labels: { copy: 'Copia il codice', headingLink: 'Link alla sezione' } })
```

Only the labels you set change.
