import type { APIRoute } from 'astro'
import { rssResponse } from '../endpoints.ts'

// Routed only when the site has `site`: a feed needs absolute URLs.
export const GET: APIRoute = ({ site }) => {
    return rssResponse(site!)
}
