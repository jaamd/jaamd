/** A step of the page's breadcrumb; one without a url is a label only. */
export interface Crumb {
    name: string
    url: string | null
}

/** The props of `StructuredData.astro`. */
export interface StructuredDataProps {
    /** The schema.org type of the page, as `TechArticle`. */
    type: string
    title: string
    description: string
    /** From the site's home to the page itself. */
    crumbs: Crumb[]
    keywords?: string[] | undefined
    /** One name, or several. */
    author?: string | string[] | undefined
    published?: Date | undefined
    modified?: Date | undefined
    /** BCP-47 tag of this page's locale. */
    language?: string | undefined
}
