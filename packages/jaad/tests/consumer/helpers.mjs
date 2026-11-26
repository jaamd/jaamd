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

/** A project's tsconfig as strict as Astro's presets go: the published sources
 *  are type-checked with the project's own options, not the package's. */
export const STRICTEST_TSCONFIG = `${JSON.stringify(
    { extends: 'astro/tsconfigs/strictest', include: ['.astro/types.d.ts', '**/*'], exclude: ['dist'] },
    null,
    4,
)}\n`

/** The TypeScript a project type-checks with. */
export const TYPESCRIPT = { typescript: '^6.0.0' }
