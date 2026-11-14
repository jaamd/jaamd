import type { APIRoute } from 'astro'
import { searchIndexResponse } from '../endpoints.ts'

export const GET: APIRoute = () => searchIndexResponse()
