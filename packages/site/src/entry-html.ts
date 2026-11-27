/// <reference path="./env.d.ts" />

import type { RenderedMarkdown } from './rendered.ts'
import { render } from 'astro:content'
import { builtImageUrls } from './markdown-export.ts'

/** A collection entry, as far as rendering it goes. */
interface RenderableEntry {
    rendered?: RenderedMarkdown | undefined
}

interface Container {
    renderToString(component: unknown): Promise<string>
}

/** An entry's HTML as its page shows it, local images resolved; null when Astro could not render it. */
export type EntryRenderer = (entry: RenderableEntry) => Promise<string | null>

async function createRenderer(): Promise<EntryRenderer> {
    let container: Container
    try {
        const module = (await import('astro/container')) as Record<string, unknown>
        const factory = (module.AstroContainer ?? module.experimental_AstroContainer) as {
            create(): Promise<Container>
        }
        container = await factory.create()
    } catch {
        return async () => {
            return null
        }
    }

    return async (entry) => {
        try {
            const { Content } = await render(entry as never)
            return await container.renderToString(Content)
        } catch {
            return null
        }
    }
}

let shared: Promise<EntryRenderer> | undefined

/** Renders entries through Astro's container API, which turns the collection's
 *  image placeholders into the built images. The API is experimental: its
 *  stable name is looked for first, so a rename keeps this working. */
export function entryRenderer(): Promise<EntryRenderer> {
    shared ??= createRenderer()
    return shared
}

/** The built URL of each local image of an entry, by the path its Markdown
 *  writes; empty when it has none, or when Astro could not render it. */
export async function entryImageUrls(entry: RenderableEntry): Promise<Map<string, string>> {
    const rendered = entry.rendered
    if (!rendered || !rendered.metadata?.localImagePaths?.length) {
        return new Map()
    }

    const renderEntry = await entryRenderer()
    const html = await renderEntry(entry)
    return html === null ? new Map() : builtImageUrls(rendered.html, html)
}
