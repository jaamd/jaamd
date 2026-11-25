import type { APIRoute } from 'astro'
import { llmsFullResponse } from '../endpoints.ts'

export const GET: APIRoute = ({ site }) => {
    return llmsFullResponse(site)
}
