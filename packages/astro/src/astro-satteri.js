import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'

// Resolved from Astro's location: the copy its processor runs on.
const fromAstro = createRequire(createRequire(import.meta.url).resolve('astro/package.json'))

export const { isSatteriProcessor, satteriCollectHastText, satteriHeadingIdsPlugin } = await import(
    pathToFileURL(fromAstro.resolve('@astrojs/markdown-satteri')).href
)
