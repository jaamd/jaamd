import type { APIRoute, GetStaticPaths } from 'astro'
import { getServedLocales } from '../collection.ts'
import { llmsFullResponse } from '../endpoints.ts'

export const getStaticPaths: GetStaticPaths = async () =>
    (await getServedLocales()).map((locale) => ({ params: { locale } }))

export const GET: APIRoute = ({ site, params }) => llmsFullResponse(site, params.locale)
