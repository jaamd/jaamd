import type { APIRoute } from 'astro'
import { rootLlmsFullResponse } from '../llms-root.ts'

export const GET: APIRoute = ({ site }) => rootLlmsFullResponse(site)
