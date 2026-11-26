/// <reference path="./env.d.ts" />

import type { BlogPost } from './posts.ts'
import type { FullPage } from '@jaamd/site/llms.ts'
import type { MarkdownExportContext } from '@jaamd/site/markdown-export.ts'
import rss from '@astrojs/rss'
import { absoluteHref, llmsDocument, llmsFullDocument, llmsLine, textResponse } from '@jaamd/site/llms.ts'
import { exportMarkdown, sourceKey } from '@jaamd/site/markdown-export.ts'
import { oncePerBuild } from '@jaamd/site/runtime.ts'
import { render } from 'astro:content'
import config from 'virtual:jaab/config'
import { absoluteUrls, withoutTitle } from './model/html.ts'
import { getPosts } from './posts.ts'

/** Where every post's Markdown is. */
const markdownContext = oncePerBuild(async (site: URL | undefined): Promise<MarkdownExportContext> => {
    const markdownUrls = new Map<string, string>()
    for (const post of await getPosts()) {
        if (post.entry.filePath) {
            markdownUrls.set(sourceKey(post.entry.filePath), absoluteHref(post.markdownHref, site))
        }
    }
    return { markdownUrls, origin: site ? site.origin : null }
})

/** A post as Markdown that reads on its own. */
export async function postMarkdown(post: BlogPost, site: URL | undefined): Promise<string> {
    return exportMarkdown(
        {
            title: post.title,
            description: post.entry.data.description,
            body: post.entry.body ?? '',
            filePath: post.entry.filePath,
        },
        await markdownContext(site),
    )
}

/** The blog's part of an `llms.txt`: one line per post, newest first. */
export async function llmsSection(site: URL | undefined): Promise<string[]> {
    const posts = await getPosts()
    if (posts.length === 0) {
        return []
    }
    const lines = posts.map((post) => {
        return llmsLine(post.title, absoluteHref(post.markdownHref, site), post.description)
    })
    return [lines.join('\n')]
}

/** Every post as Markdown, newest first. */
export async function llmsFullPages(site: URL | undefined): Promise<FullPage[]> {
    const posts = await getPosts()
    return Promise.all(
        posts.map(async (post) => {
            return { markdown: await postMarkdown(post, site), source: absoluteHref(post.markdownHref, site) }
        }),
    )
}

export async function llmsResponse(site: URL | undefined): Promise<Response> {
    return textResponse(llmsDocument(config.title, config.description, await llmsSection(site)))
}

export async function llmsFullResponse(site: URL | undefined): Promise<Response> {
    return textResponse(llmsFullDocument(await llmsFullPages(site)))
}

/** A post rendered as its page shows it, or null when Astro could not. */
type PostRenderer = (post: BlogPost) => Promise<string | null>

interface Container {
    renderToString(component: unknown): Promise<string>
}

/** Renders posts through Astro's container API. The API is experimental: its
 *  stable name is looked for first, so a rename leaves the feed working. */
async function createRenderer(): Promise<PostRenderer> {
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

    return async (post) => {
        try {
            const { Content } = await render(post.entry as never)
            return await container.renderToString(Content)
        } catch {
            return null
        }
    }
}

let warnedFallback = false

/** A post's HTML for the feed, without the title its item already carries.
 *  Rendered, so its local images resolve; should Astro fail to, the
 *  collection's HTML without those images keeps the feed building. */
async function feedHtml(post: BlogPost, renderPost: PostRenderer): Promise<string> {
    const rendered = await renderPost(post)
    if (rendered !== null) {
        return withoutTitle(rendered)
    }

    if (!warnedFallback) {
        warnedFallback = true
        console.warn('jaab: rss.xml could not render the posts, so their local images are left out of it.')
    }
    const html = post.entry.rendered?.html ?? ''
    return withoutTitle(html.replace(/<img\b[^>]*__ASTRO_IMAGE_[^>]*>/g, ''))
}

/** `rss.xml`: the newest posts in full. Only routed when `site` is set. */
export async function rssResponse(site: URL): Promise<Response> {
    const limit = config.blog.feed?.limit ?? 0
    const posts = (await getPosts()).slice(0, limit)
    const renderPost = await createRenderer()
    const items = await Promise.all(
        posts.map(async (post) => {
            const content = await feedHtml(post, renderPost)
            return {
                title: post.title,
                link: new URL(post.href, site).href,
                pubDate: post.date,
                ...(post.description ? { description: post.description } : {}),
                content: absoluteUrls(content, site.origin),
                categories: post.tags,
            }
        }),
    )

    return rss({
        title: config.title,
        description: config.description ?? config.title,
        site,
        items,
        customData: `<language>${config.lang}</language>`,
        trailingSlash: config.blog.trailingSlash,
    })
}
