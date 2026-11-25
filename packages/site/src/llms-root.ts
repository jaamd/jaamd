import type { FullPage } from './llms.ts'
import llmsSources from 'virtual:jaamd/llms'
import config from 'virtual:jaamd/site'
import { llmsDocument, llmsFullDocument, textResponse } from './llms.ts'

/** What a package's llms module exports for the root files. */
export interface LlmsModule {
    /** Its part of `llms.txt`, headed from `level` down. */
    llmsSection(site: URL | undefined, level: number): Promise<string[]>
    /** Its pages, in its own order. */
    llmsFullPages(site: URL | undefined): Promise<FullPage[]>
}

export interface LlmsSourceModule {
    label: string
    module: LlmsModule
}

/** The site's `llms.txt`: one section per package, in the order of the site. */
export async function rootLlmsResponse(site: URL | undefined): Promise<Response> {
    const sections = await Promise.all(
        llmsSources.map(async (source) => {
            const blocks = await source.module.llmsSection(site, 3)
            return [`## ${source.label}`, ...blocks]
        }),
    )
    return textResponse(llmsDocument(config.title, config.description, sections.flat()))
}

/** The site's `llms-full.txt`: every page of every package. */
export async function rootLlmsFullResponse(site: URL | undefined): Promise<Response> {
    const pages = await Promise.all(
        llmsSources.map((source) => {
            return source.module.llmsFullPages(site)
        }),
    )
    return textResponse(llmsFullDocument(pages.flat()))
}
