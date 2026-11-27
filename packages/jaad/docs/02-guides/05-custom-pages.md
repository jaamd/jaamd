---
description: "Pages of your own beside the documentation, with your layout or with JAAD's."
---

# Custom pages

Files in `src/pages/` are regular Astro pages. They keep their own layouts,
styles and metadata; JAAD options affect only documentation below `routeBase`.

The `site` template creates a local layout and landing page, then mounts the
documentation at `/docs`:

:::code-tabs

```bash npm
npm create @jaamd@latest my-site -- --template site
```

```bash pnpm
pnpm create @jaamd@latest my-site --template site
```

```bash yarn
yarn create @jaamd my-site --template site
```

```bash bun
bunx @jaamd/create@latest my-site --template site
```

:::

```
src/
  layouts/SiteLayout.astro
  pages/index.astro
  styles/site.css
  utils/base.ts
public/
  favicon.svg
docs/
  01-introduction.md
tsconfig.json
```

`utils/base.ts` exports `withBase()`, which applies Astro's deployment base to
a root-relative href. Use it for every link the layout writes, so the site keeps
working when it moves to a subpath.

Use the generated layout for other application pages:

```astro
---
import SiteLayout from '../layouts/SiteLayout.astro'
---

<SiteLayout pageTitle="Pricing">
    <h1>Pricing</h1>
</SiteLayout>
```

A page of yours on a route of the docs stops the build: see
[`routeBase`](../03-configuration/10-routeBase.md#limits).

## Keeping JAAD's header and footer

For a page beside docs at the root, such as a changelog, use JAAD's header and
footer instead of a layout of your own:

```astro
---
import Page from '@jaamd/jaad/layouts/Page.astro'
---

<Page title="Changelog">
    <h1>Changelog</h1>
</Page>
```

It renders the documentation header and footer, the theme, and your
configuration's title, navigation and social links around whatever you put
inside. `title` and `description` set the metadata for the page; `bare` drops
the default spacing when the content needs the full width; `class` is added to
the body.

Search comes with the header, as its icon. There is no sidebar and no table of
contents: the page has no place in the documentation's navigation. To restructure documentation pages themselves, use
[Advanced layout](06-advanced-layout.md).

## Matching the documentation's layout

- `.site-chrome`: the column of the header's content, shared by the footer:
  `--site-chrome-width` less the side gutters.
- `.site-main`: vertical margin and horizontal padding of the main landmark.
  `bare` swaps it for `.site-main-bare`, which has none.
- Layout tokens (`--site-content-width`, `--site-page-padding`, …) are listed
  in [Styles](04-styles.md#layout-tokens).

```astro
<Page title="Changelog">
    <div class="site-chrome">…</div>
</Page>
```

## Tailwind

With [`tailwind: true`](../03-configuration/25-tailwind.md), utilities on
`Page` pages use JAAD's tokens.
