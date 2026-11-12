import { frontmatterFields } from '@jaamd/astro/frontmatter'
import { glob } from 'astro/loaders'
import { z } from 'astro/zod'
import { defineCollection } from 'astro:content'
import config from 'virtual:jaad/config'
import { getDocCollectionId } from './utils/docs.ts'

const docsPages = defineCollection({
    loader: glob({
        pattern: '**/*.md',
        base: config.docsDir,
        // Keep URLs file-driven even if markdown contains an unrelated slug field.
        generateId: ({ entry }) => getDocCollectionId(entry),
    }),
    // Every field is optional: markdown without frontmatter works as-is.
    schema: z.object({
        ...frontmatterFields(z),
        /** Shorter label, in navigation only. */
        label: z.string().optional(),
        /** Pairs this page with its translations when the slugs differ. */
        translationKey: z.string().optional(),
        /** Replaces the filename prefix number. */
        order: z.number().int().optional(),
    }),
})

export const collections = { docsPages }
