import { fileURLToPath } from 'node:url'
import { packPackage } from '../../../core/tests/consumer/helpers.mjs'

export * from '../../../core/tests/consumer/helpers.mjs'

const ASTRO = fileURLToPath(new URL('../..', import.meta.url))
const CORE = fileURLToPath(new URL('../../../core', import.meta.url))
let packed

/** `@jaamd/astro` and `@jaamd/core` from this workspace instead of the registry. */
export function jaamdOverride() {
    packed ??= {
        '@jaamd/astro': `file:${packPackage(ASTRO)}`,
        '@jaamd/core': `file:${packPackage(CORE)}`,
    }
    return packed
}
