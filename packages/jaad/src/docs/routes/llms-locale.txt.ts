import type { APIRoute, GetStaticPaths } from 'astro'
import { getServedLocales } from '../collection.ts'
import { llmsResponse } from '../endpoints.ts'

export const getStaticPaths: GetStaticPaths = async () => {
    return (await getServedLocales()).map((locale) => {
        return { params: { locale } }
    })
}

export const GET: APIRoute = ({ site, params }) => {
    return llmsResponse(site, params.locale)
}
