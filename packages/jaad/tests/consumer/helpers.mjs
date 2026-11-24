import { fileURLToPath } from 'node:url'
import { jaamdOverride as markdownOverride, packPackage } from '../../../astro/tests/consumer/helpers.mjs'

export * from '../../../astro/tests/consumer/helpers.mjs'

const SITE = fileURLToPath(new URL('../../../site', import.meta.url))
let packed

/** JAAMD's packages and `@jaamd/site` from this workspace instead of the registry. */
export function jaamdOverride() {
    packed ??= {
        ...markdownOverride(),
        '@jaamd/site': `file:${packPackage(SITE)}`,
    }
    return packed
}
