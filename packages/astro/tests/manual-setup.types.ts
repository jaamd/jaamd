// Type-checked, not run: the presets fit Astro's processors, as the manual setup page shows.
import { unified } from '@astrojs/markdown-remark'
import { satteri } from '@astrojs/markdown-satteri'
import { satteriPlugins, unifiedPlugins } from '../index.ts'

satteri(satteriPlugins())
unified(unifiedPlugins({ features: { lightbox: false }, labels: { copy: 'Copia' } }))
