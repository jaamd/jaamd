# Manual setup

To bypass the integration, register the plugins yourself on the processor you
use. `@jaamd/astro` exports them as presets, in the order they have to run and
with Astro's own heading ids. On Sätteri, Astro's default:

```ts
// astro.config.mjs
import { satteri } from '@astrojs/markdown-satteri'
import { satteriPlugins } from '@jaamd/astro'

export default defineConfig({
    markdown: {
        processor: satteri(satteriPlugins()),
    },
})
```

On unified:

```ts
// astro.config.mjs
import { unified } from '@astrojs/markdown-remark'
import { unifiedPlugins } from '@jaamd/astro'

export default defineConfig({
    markdown: {
        processor: unified(unifiedPlugins()),
    },
})
```

Both take the integration's [`features` and `labels`](../01-getting-started/02-options.md#features).
To add plugins of your own, spread the preset's lists: on Sätteri, keep
`jaamd-directive-fallback`, the last mdast plugin, after yours, since it keeps
directives no plugin claimed. The plugins one by one are in `@jaamd/core`, see
[Other frameworks](./03-other-frameworks.md).

Then load the styles and run the client script yourself, with the same
`features` and `labels` if you set them:

```astro
---
import '@jaamd/astro/default.css' // variable fallbacks; omit if you provide your own
import '@jaamd/astro/styles.css'
---

<div class="jaamd-content">
    <slot />
</div>
<script>
    import { enhance } from '@jaamd/astro/client'
    let dispose
    function run() {
        dispose?.()
        dispose = enhance('.jaamd-content')
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
