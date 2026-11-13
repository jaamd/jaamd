# Manual setup

To bypass the integration, register the plugins yourself on the processor you
use. On Sätteri, Astro's default:

```ts
// astro.config.mjs
import { satteri } from '@astrojs/markdown-satteri'
import {
    satteriAlert,
    satteriCodeTabs,
    satteriToc,
    satteriDirectiveFallback,
    satteriTableWrapper,
    satteriHeadingLinks,
} from '@jaamd/astro'

export default defineConfig({
    markdown: {
        processor: satteri({
            features: { directive: true },
            mdastPlugins: [satteriAlert, satteriCodeTabs, satteriToc, satteriDirectiveFallback],
            hastPlugins: [satteriTableWrapper, satteriHeadingLinks],
        }),
    },
})
```

`satteriDirectiveFallback` keeps directives no plugin handles, which Sätteri
drops: blocks as a plain `<div>`, an inline `:name` as typed. Put it last.

On unified, Astro's `rehypeHeadingIds` goes before `rehypeHeadingLinks`, which
links the ids it finds:

```ts
// astro.config.mjs
import { rehypeHeadingIds, unified } from '@astrojs/markdown-remark'
import {
    remarkAlert,
    remarkCodeTabs,
    remarkDirective,
    remarkToc,
    rehypeTableWrapper,
    rehypeHeadingLinks,
} from '@jaamd/astro'

export default defineConfig({
    markdown: {
        processor: unified({
            remarkPlugins: [remarkAlert, remarkDirective, remarkCodeTabs, remarkToc],
            rehypePlugins: [rehypeTableWrapper, rehypeHeadingIds, rehypeHeadingLinks],
        }),
    },
})
```

Then load the styles and run the client script yourself:

```astro
---
import '@jaamd/astro/default.css' // variable fallbacks; omit if you provide your own
import '@jaamd/astro/styles.css'
---

<div class="jaamd-content">
    <slot />
</div>
<script>
    import { initMarkdownEnhancements } from '@jaamd/astro/client'
    function run() {
        initMarkdownEnhancements('.jaamd-content')
    }
    run()
    document.addEventListener('astro:page-load', run)
</script>
```

The CSS files can also be imported from plain `.css`:

```css
@import '@jaamd/astro/default.css';
@import '@jaamd/astro/styles.css';
```
