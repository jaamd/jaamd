---
description: The MarkdownContent component, which wraps rendered Markdown and loads the styles.
---

# MarkdownContent

`MarkdownContent` is a polymorphic component. It renders as `<div>` by default
and accepts any valid HTML tag via the `as` prop. It loads the stylesheets; the
[client script](./02-client.md) the integration injects enhances its content.

```ts
import MarkdownContent from '@jaamd/astro/components'
```

## Props

| Prop      | Type      | Default | Description                                                                               |
| --------- | --------- | ------- | ----------------------------------------------------------------------------------------- |
| `as`      | `HTMLTag` | `"div"` | The HTML element to render as.                                                            |
| `class`   | `string`  | -       | Extra CSS classes appended to the wrapper.                                                |
| _...rest_ | -         | -       | All standard HTML attributes for the chosen `as` element (e.g. `id`, `data-*`, `aria-*`). |

The `jaamd-content` class is always present on the wrapper element. It is the
selector used by the JS enhancements and must not be removed.

```astro
---
import MarkdownContent from '@jaamd/astro/components'
---

<!-- Default: renders as <div class="jaamd-content"> -->
<MarkdownContent>
    <slot />
</MarkdownContent>

<!-- Custom tag: renders as <article class="jaamd-content"> -->
<MarkdownContent as="article">
    <slot />
</MarkdownContent>

<!-- Extra classes: renders as <article class="jaamd-content prose mx-auto"> -->
<MarkdownContent as="article" class="prose mx-auto">
    <slot />
</MarkdownContent>
```
