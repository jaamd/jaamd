/// <reference path="./env.d.ts" />

import { frontmatterFields } from '@jaamd/astro/frontmatter'
import { glob } from 'astro/loaders'
import { z } from 'astro/zod'
import { defineCollection } from 'astro:content'
import config from 'virtual:jaab/config'
import { postSlug } from './model/posts.ts'

/** The posts, by slug, and the blog's own `index.md`, which introduces the
 *  index. A project with JAAD too spreads both packages' collections into one. */
export const collections = {
    blogPosts: defineCollection({
        loader: glob({
            pattern: ['**/*.md', '!index.md'],
            base: config.blog.dir,
            // Keep URLs file-driven even if markdown contains an unrelated slug field.
            generateId: ({ entry }) => {
                return postSlug(entry) ?? entry
            },
        }),
        schema: z.object({
            ...frontmatterFields(z),
            date: z.coerce.date(),
            /** For the metadata and the feed; never shown. */
            tags: z.array(z.string()).default([]),
            /** Keys of the `authors` option. */
            authors: z.union([z.string(), z.array(z.string())]).optional(),
            /** Old addresses, redirected to the post. */
            aliases: z.array(z.string()).default([]),
        }),
    }),
    blogIndex: defineCollection({
        loader: glob({ pattern: 'index.md', base: config.blog.dir }),
        schema: z.object(frontmatterFields(z)),
    }),
}
