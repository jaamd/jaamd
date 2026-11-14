import type { APIRoute, GetStaticPaths } from 'astro'
import { buildLocales, localePrefix } from '../../site/runtime.ts'
import { getDocsTree } from '../collection.ts'

/** Raw markdown at the page's own url plus `.md`, for readers and for LLMs. */
export const getStaticPaths: GetStaticPaths = async () => {
    const paths: {
        params: { slug: string }
        props: { id: string; locale?: string }
    }[] = []

    for (const locale of buildLocales()) {
        const { pages } = await getDocsTree(locale)
        const prefix = localePrefix(locale)

        for (const page of pages) {
            paths.push({
                params: { slug: `${prefix}${page.slug}` },
                props: { id: page.id, locale },
            })
        }
    }

    return paths
}

export const GET: APIRoute = async ({ props }) => {
    const { id, locale } = props as { id: string; locale?: string }
    const page = (await getDocsTree(locale)).byId.get(id)
    if (!page) return new Response('Not found', { status: 404 })

    return new Response(page.source.body ?? '', {
        headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
    })
}
