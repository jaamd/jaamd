import type { z as Zod } from 'astro/zod'

/**
 * Frontmatter fields shared by JAAMD sites, to spread into a collection schema:
 * `z.object({ ...frontmatterFields(z), order: z.number().optional() })`.
 */
export function frontmatterFields(z: typeof Zod) {
    return {
        title: z.string().optional(),
        description: z.string().optional(),
        /** For the site to leave out of production builds: JAAMD only declares it. */
        draft: z.boolean().default(false),
        /** For the site's metadata and search; never rendered. */
        keywords: z.array(z.string()).default([]),
        author: z.string().optional(),
        /** Public path or URL; false drops the site's. */
        ogImage: z
            .union([
                // A root-relative path or an http(s) URL; `//host/...` is neither.
                z.string().refine(
                    (v) => {
                        return /^\/(?!\/)/.test(v) || /^https?:\/\//.test(v)
                    },
                    {
                        message: 'ogImage must be a public url, such as "/og/page.png"',
                    },
                ),
                z.literal(false),
            ])
            .optional(),
        lastUpdated: z.coerce.date().optional(),
    }
}
