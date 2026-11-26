import type { BlogPost } from '../posts.ts'
import type { APIRoute, GetStaticPaths } from 'astro'
import { postMarkdown } from '../endpoints.ts'
import { getPosts } from '../posts.ts'

/** The post as Markdown at its own url plus `.md`, for readers and for LLMs. */
export const getStaticPaths: GetStaticPaths = async () => {
    const posts = await getPosts()
    return posts.map((post) => {
        return { params: { slug: post.slug }, props: { post } }
    })
}

export const GET: APIRoute = async ({ props, site }) => {
    const { post } = props as { post: BlogPost }
    return new Response(await postMarkdown(post, site), {
        headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
    })
}
