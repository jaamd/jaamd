import type { HastPluginEntry } from 'satteri'
import { satteriHeadingLinks as headingLinks } from '@jaamd/core/satteri'
import { satteriCollectHastText, satteriHeadingIdsPlugin } from '../astro-satteri.js'

/**
 * Appends the anchor to headings. Astro assigns ids after user plugins, so its
 * own id plugin runs first here; Astro's later pass keeps the ids it finds.
 */
export const satteriHeadingLinks: HastPluginEntry = headingLinks(satteriHeadingIdsPlugin(), (node, ctx) => {
    // Same text Astro records for the heading, frontmatter expressions resolved.
    const raw = ctx.textContent(node)
    return raw.includes('frontmatter') ? satteriCollectHastText(node, ctx.data.astro?.frontmatter ?? {}) : raw
})
