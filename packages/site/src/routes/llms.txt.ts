import type { APIRoute } from 'astro'
import { rootLlmsResponse } from '../llms-root.ts'

export const GET: APIRoute = ({ site }) => rootLlmsResponse(site)
