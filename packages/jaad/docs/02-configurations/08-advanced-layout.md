---
description: Replace the documentation page layout with a DocsFrame of your own.
---

# Advanced layout

Use the default layout unless the documentation needs a different structure.
To replace it, create:

```
src/jaad/DocsFrame.astro
```

JAAD detects the file automatically. Restart the development server after
creating it; later edits are watched.

The frame controls `<body data-docs>`. JAAD still owns the HTML document,
metadata, theme, fonts, view transitions and keyboard navigation.

## Frame contract

| Slot                | Contents                          |
| ------------------- | --------------------------------- |
| `header`            | Header, navigation and search     |
| `sidebar`           | Desktop page navigation           |
| `mobile-navigation` | Mobile page and heading selectors |
| `breadcrumbs`       | Current documentation path        |
| `page-actions`      | Copy and edit actions             |
| `content`           | Rendered Markdown article         |
| `page-navigation`   | Previous and next links           |
| `table-of-contents` | Desktop heading navigation        |
| `footer`            | Documentation footer              |

Omitting a slot removes that element from every documentation page.

```astro
---
import type { DocsFrameProps } from '@jaamd/jaad/advanced'

type Props = DocsFrameProps
const { page, headings } = Astro.props
---

<div class="docs-frame" data-page={page.id}>
    <slot name="header" />
    <slot name="mobile-navigation" />

    <div class="docs-grid">
        <aside class="docs-aside">
            <slot name="sidebar" />
        </aside>
        <main>
            <slot name="breadcrumbs" />
            <slot name="page-actions" />
            <slot name="content" />
            <slot name="page-navigation" />
        </main>
        {headings.length > 0 && (
            <aside class="docs-aside">
                <slot name="table-of-contents" />
            </aside>
        )}
    </div>

    <slot name="footer" />
</div>

<style>
    .docs-grid {
        display: grid;
        grid-template-columns: minmax(0, 56rem);
        justify-content: center;
    }

    .docs-aside {
        display: none;
    }

    @media (min-width: 64rem) {
        .docs-grid {
            grid-template-columns: 16rem minmax(0, 56rem) 16rem;
        }

        .docs-aside {
            display: block;
        }
    }
</style>
```

Wrap the slots you need to position in elements of your own, and style those.

`DocsFrameProps` exposes the current page, headings and navigation model for
conditional placement. JAAD's internal components are not part of this API.

| Property                  | Contents                                     |
| ------------------------- | -------------------------------------------- |
| `page.id`                 | Content collection ID                        |
| `page.slug`               | File-derived slug, including the opening one |
| `page.title`              | Resolved page title                          |
| `page.section`            | Section key, when the docs have sections     |
| `page.chapter`            | Chapter slug, when present                   |
| `headings`                | `{ depth, slug, text }[]` for levels 2 and 3 |
| `navigation.groups`       | The whole tree: sections, chapters and pages |
| `navigation.previousPage` | Previous navigation item or `null`           |
| `navigation.nextPage`     | Next navigation item or `null`               |

`page.chapter` and a chapter group's `chapter` are directory slugs, such as
`getting-started`. Title-case them for display.

### Navigation shapes

`DocsNavGroup` is a union discriminated on `type`. With sections, every group
is a `section`, holding the pages and chapters of that section.

```ts
type DocsNavEntry = { type: 'page'; item: DocsNavItem } | { type: 'chapter'; chapter: string; items: DocsNavItem[] }

type DocsNavGroup = DocsNavEntry | { type: 'section'; section: string; label: string; entries: DocsNavEntry[] }

interface DocsNavItem {
    title: string
    section?: string
    chapter: string | undefined
    href: string
    isActive: boolean
}
```

Groups and their items arrive in display order.

`href` already carries `routeBase` and the deployment `base`. `isActive` marks
the current page.

`DocsFrameProps`, `DocsNavigation`, `DocsNavGroup`, `DocsNavEntry`,
`DocsHeading`, `DocsNavItem` and `DocsPageData` are exported from `@jaamd/jaad/advanced`.

For colours, fonts, widths and spacing, use
[`src/jaad.css`](06-styles.md) instead.
