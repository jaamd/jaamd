import type { z as Zod } from 'astro/zod'

/**
 * Frontmatter fields shared by JAAMD sites, to spread into a collection schema:
 * `z.object({ ...frontmatterFields(z), order: z.number().optional() })`.
 */
export function frontmatterFields(z: typeof Zod) {
    return {
        title: z.string().optional(),
        description: z.string().optional(),
        /** Left out of production builds. */
        draft: z.boolean().default(false),
        /** Metadata and search weight; never rendered. */
        keywords: z.array(z.string()).default([]),
        author: z.string().optional(),
        /** Public path or URL; false drops the site's. */
        ogImage: z
            .union([
                z.string().refine((v) => v.startsWith('/') || /^https?:\/\//.test(v), {
                    message: 'ogImage must be a public url, such as "/og/page.png"',
                }),
                z.literal(false),
            ])
            .optional(),
        lastUpdated: z.coerce.date().optional(),
    }
}
