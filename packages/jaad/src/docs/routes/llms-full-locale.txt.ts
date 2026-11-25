import type { APIRoute, GetStaticPaths } from 'astro'
import { getServedLocales } from '../collection.ts'
import { llmsFullResponse } from '../endpoints.ts'

export const getStaticPaths: GetStaticPaths = async () => {
    return (await getServedLocales()).map((locale) => {
        return { params: { locale } }
    })
}

export const GET: APIRoute = ({ site, params }) => {
    return llmsFullResponse(site, params.locale)
}
