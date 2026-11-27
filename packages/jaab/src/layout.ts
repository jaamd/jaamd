/// <reference path="./env.d.ts" />

import type { BlogPost } from './posts.ts'
import type { MetaProps } from '@jaamd/site/meta.ts'
import type { StructuredDataProps } from '@jaamd/site/structured-data.ts'
import type { AstroComponentFactory } from 'astro/runtime/server/index.js'
import { fill } from '@jaamd/site/helpers.ts'
import { pageDescription, pageHeadings, renderedTitle, type PageHeading } from '@jaamd/site/rendered.ts'
import { ui } from '@jaamd/site/runtime.ts'
import { render } from 'astro:content'
import config from 'virtual:jaab/config'
import { pageCount, pagePosts } from './model/posts.ts'
import { getIntro, getPosts } from './posts.ts'
import { blogUrls } from './runtime.ts'
import { blogFileHref, blogPageHref, indexPageHref } from './urls.ts'

export type { BlogPost } from './posts.ts'

/** What `BlogMeta` writes in a layout's `<head>`. */
export interface BlogMeta {
    /** For `<meta>`, `<link>` and Open Graph; `title` is the whole page title. */
    head: MetaProps
    /** JSON-LD, on a post. */
    structuredData?: StructuredDataProps | undefined
}

/** What every page of the blog hands its layout. */
interface BlogPageProps {
    /** The page's own title, without the site's; none on an index with no title of its own. */
    title?: string | undefined
    description?: string | undefined
    /** The blog's index, its first page. */
    indexHref: string
    /** `rss.xml`, when the blog writes one. */
    feedHref: string | null
    meta: BlogMeta
}

/** A page of the index. The slot holds `blog/index.md` on the first page. */
export interface BlogIndexProps extends BlogPageProps {
    kind: 'index'
    /** The posts on this page, newest first. */
    posts: BlogPost[]
    /** Counted from 1. */
    page: number
    pages: number
    newerHref: string | null
    olderHref: string | null
    /** The title of `blog/index.md`, else "Blog". */
    heading: string
    /** True when the slot opens with that title itself. */
    ownHeading: boolean
}

/** A post. The slot holds its Markdown, rendered. */
export interface BlogPostProps extends BlogPageProps {
    kind: 'post'
    post: BlogPost
    headings: PageHeading[]
    /** True when the slot opens with the post's title itself. */
    ownHeading: boolean
}

/** The props of the blog's layout, its own or a project's. */
export type BlogLayoutProps = BlogIndexProps | BlogPostProps

/** A page's props, and the Markdown its layout puts in the slot. */
export interface BlogPage<Props extends BlogLayoutProps> {
    props: Props
    Content: AstroComponentFactory | null
}

/** The page's whole title and description, as the site's shell writes them. */
function documentText(title: string | undefined, description: string | undefined) {
    return {
        title: title ? `${title} | ${config.title}` : config.title,
        description: description ?? config.description ?? config.title,
    }
}

const feedHref = (): string | null => {
    return config.blog.feed ? blogFileHref('rss.xml', blogUrls()) : null
}

/** Index page `page`, counted from 1. */
export async function indexPage(page: number): Promise<BlogPage<BlogIndexProps>> {
    const t = ui()
    const posts = await getPosts()
    const pages = pageCount(posts.length, config.blog.perPage)
    const urls = blogUrls()

    // `blog/index.md` introduces the first page; the others carry its title only.
    const intro = await getIntro()
    const introTitle = intro ? (intro.data.title ?? renderedTitle(intro.rendered)) : null
    const heading = introTitle ?? t('blog.label')
    const Content = intro && page === 1 ? (await render(intro as never)).Content : null
    const ownHeading = Content !== null && renderedTitle(intro?.rendered) !== null

    const pageLabel = fill(t('blog.page'), { page, pages })
    const title = page === 1 ? (introTitle ?? undefined) : `${heading} · ${pageLabel}`
    const description = intro?.data.description ?? pageDescription(intro?.rendered, heading) ?? undefined

    return {
        Content,
        props: {
            kind: 'index',
            title,
            description,
            posts: pagePosts(posts, page, config.blog.perPage),
            page,
            pages,
            newerHref: page > 1 ? indexPageHref(page - 1, urls) : null,
            olderHref: page < pages ? indexPageHref(page + 1, urls) : null,
            heading,
            ownHeading,
            indexHref: indexPageHref(1, urls),
            feedHref: feedHref(),
            meta: { head: documentText(title, description) },
        },
    }
}

/** The page of `post`. */
export async function postPage(post: BlogPost): Promise<BlogPage<BlogPostProps>> {
    const t = ui()
    const { entry } = post
    const site = import.meta.env.SITE
    const urls = blogUrls()

    const keywords = [...post.keywords, ...post.tags]
    const description = post.description ?? config.description ?? config.title

    const absolute = (href: string): string | null => {
        return site ? new URL(href, site).href : null
    }
    const home = absolute(import.meta.env.BASE_URL)
    const index = absolute(blogPageHref('', urls))
    // At the site's root, the blog's index is the home itself: one crumb, not two.
    const crumbs = [
        { name: config.title, url: home },
        ...(index === home ? [] : [{ name: t('blog.label'), url: index }]),
        { name: post.title, url: absolute(post.href) },
    ]

    const { Content } = await render(entry as never)

    return {
        Content,
        props: {
            kind: 'post',
            title: post.title,
            description,
            post,
            headings: pageHeadings(entry.rendered),
            ownHeading: renderedTitle(entry.rendered) !== null,
            indexHref: indexPageHref(1, urls),
            feedHref: feedHref(),
            meta: {
                head: {
                    ...documentText(post.title, description),
                    keywords,
                    authors: post.authors,
                    image: entry.data.ogImage,
                    modified: post.updated ?? undefined,
                    markdown: config.blog.llms ? post.markdownHref : undefined,
                    article: { published: post.date, tags: post.tags },
                },
                structuredData: {
                    type: 'BlogPosting',
                    title: post.title,
                    description,
                    crumbs,
                    keywords,
                    authors: post.authors,
                    published: post.date,
                    modified: post.updated ?? undefined,
                    image: entry.data.ogImage,
                },
            },
        },
    }
}
