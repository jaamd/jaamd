/// <reference path="../env.d.ts" />

import type { DocsSection } from './config.ts'
import type { DocsPageData } from './types.ts'
import type { DocsUrlOptions } from './urls.ts'
import { pageAuthors, type Author } from '@jaamd/site/authors.ts'
import { DEFAULT_LOCALE } from '@jaamd/site/runtime.ts'
import config from 'virtual:jaad/config'

/** The virtual config, read once. */
export const SECTIONS: DocsSection[] = config.docs.sections

/** The fields every href builder takes, in one place. */
export function docsUrls(locale?: string): DocsUrlOptions {
    return {
        docsBase: config.docs.base,
        deploymentBase: import.meta.env.BASE_URL,
        locale,
        defaultLocale: DEFAULT_LOCALE,
        trailingSlash: config.docs.trailingSlash,
    }
}

/** Who wrote a page: those it names, else the docs' default author. */
export function docsPageAuthors(data: DocsPageData): Author[] {
    return pageAuthors(data, config.authors, config.docs.author)
}
