import type { DocsSection } from './config.ts'
import type { DocsUrlOptions } from './urls.ts'
import config from 'virtual:jaad/config'
import { DEFAULT_LOCALE } from '../site/runtime.ts'

/** The virtual config, read once. */
export const SECTIONS: DocsSection[] = config.docs.sections

/** The four fields every href builder takes, in one place. */
export function docsUrls(locale?: string): DocsUrlOptions {
    return {
        docsBase: config.docs.base,
        deploymentBase: import.meta.env.BASE_URL,
        locale,
        defaultLocale: DEFAULT_LOCALE,
    }
}
