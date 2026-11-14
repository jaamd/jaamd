import { frontmatterFields } from '@jaamd/astro/frontmatter'
import { glob } from 'astro/loaders'
import { z } from 'astro/zod'
import { defineCollection } from 'astro:content'
import config from 'virtual:jaad/config'
import { collectionIdFor, collectionName } from './model/ids.ts'

const LOCALES = config.locales.map((locale) => locale.code)

/** The markdown of one directory, as the pages of `section` when there is one. */
const docs = (base: string, section?: string) =>
    defineCollection({
        loader: glob({
            pattern: '**/*.md',
            base,
            // Keep URLs file-driven even if markdown contains an unrelated slug field.
            generateId: ({ entry }) => collectionIdFor(entry, section, LOCALES),
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

/** `docsPages` for `docsDir`, and one collection per section: each watches its
 *  own directory. */
export const collections = Object.fromEntries([
    ...(config.docs.dirInUse ? [[collectionName(), docs(config.docs.dir)]] : []),
    ...config.docs.sections.map((section) => [collectionName(section.key), docs(section.dir, section.key)]),
])
