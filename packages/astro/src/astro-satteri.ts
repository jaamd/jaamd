import type * as AstroSatteri from '@astrojs/markdown-satteri'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'

// Resolved from Astro's location: the copy its processor runs on.
const fromAstro = createRequire(createRequire(import.meta.url).resolve('astro/package.json'))

export const { satteriCollectHastText, satteriHeadingIdsPlugin }: typeof AstroSatteri = await import(
    /* @vite-ignore */ pathToFileURL(fromAstro.resolve('@astrojs/markdown-satteri')).href
)
