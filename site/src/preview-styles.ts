import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { themes } from '@jaamd/core/themes'

const require = createRequire(import.meta.url)
const read = (specifier: string) => readFileSync(require.resolve(specifier), 'utf8')

const PREVIEW = '.landing-preview'

/** The themes the preview offers: the site's own first. */
export const previewThemes = [
    { slug: 'default', name: 'Default', mode: 'dual' },
    ...themes.map(({ slug, name, mode }) => ({ slug, name, mode })),
]

/**
 * JAAMD's variables and themes, scoped to the preview. Themes set the seeds
 * and default.css derives the rest from them, so it is scoped too: each
 * derivation then reads the theme of the preview, not the page's.
 * A dark theme carries `data-mode="dark"`, which takes default.css's dark
 * derivations on a light page.
 */
export function previewCss(): string {
    const defaults = read('@jaamd/core/default.css')
        .replace(/^(\s*):root \{$/m, `$1${PREVIEW} {`)
        .replace(/^(\s*)html\.dark \{$/m, `$1html.dark ${PREVIEW}, ${PREVIEW}[data-mode='dark'] {`)

    const scoped = themes.map(({ slug }) => {
        const selector = `${PREVIEW}[data-jaamd-theme='${slug}']`
        return read(`@jaamd/core/themes/${slug}.css`)
            .replace(/^:root \{$/m, `${selector} {`)
            .replace(/^html\.dark \{$/m, `html.dark ${selector} {`)
    })

    return [defaults, ...scoped].join('\n')
}
