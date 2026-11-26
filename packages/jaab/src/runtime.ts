import type { BlogUrlOptions } from './urls.ts'
import config from 'virtual:jaab/config'

/** The fields every href builder takes, in one place. */
export function blogUrls(): BlogUrlOptions {
    return {
        base: config.blog.base,
        deploymentBase: import.meta.env.BASE_URL,
        trailingSlash: config.blog.trailingSlash,
    }
}
