import type { APIRoute } from 'astro'
import { llmsResponse } from '../endpoints.ts'

export const GET: APIRoute = ({ site }) => {
    return llmsResponse(site)
}
