import type { AstroIntegration } from 'astro'
import { fileURLToPath } from 'node:url'
import { DEFAULT_SELECTOR } from '@jaamd/core/client'
import { registerPlugins, type PluginOptions } from './processors.ts'
import { withTheme, type ShikiTheme } from './shiki.ts'

export interface JaamdOptions extends PluginOptions {
    /**
     * Elements the client script enhances. `<MarkdownContent>` renders
     * `.jaamd-content`; a wrapper of your own needs its selector here.
     * @default ".jaamd-content"
     */
    selector?: string

    /**
     * Shiki theme. `{ light, dark }` switches on a `.dark` class on `<html>`.
     * Unset, `markdown.shikiConfig` is left as configured; "github-light"
     * replaces only Astro's own default.
     * @default "github-light"
     */
    theme?: ShikiTheme

    /**
     * Injects the default `--jaamd-*` values on every page. `<MarkdownContent>`
     * imports them anyway.
     * @default true
     */
    defaultVariables?: boolean
}

/** Absolute path of a stylesheet of this package, as a quoted specifier: injected
 *  scripts resolve from the project, where `@jaamd/astro` may be unreachable. */
const own = (relative: string) => JSON.stringify(fileURLToPath(new URL(relative, import.meta.url)))

const STYLES = {
    variables: own('../dist/default.css'),
    shikiDual: own('../dist/shiki-dual.css'),
    markdown: own('../dist/styles.css'),
}

const CLIENT = own('./client.ts')

/** Registers JAAMD's plugins on Astro's markdown processor and injects its styles and client script. */
export default function jaamd(options: JaamdOptions = {}): AstroIntegration {
    const { selector = DEFAULT_SELECTOR, theme, defaultVariables = true, features, labels } = options
    const client = JSON.stringify({ features, labels })

    return {
        name: '@jaamd/astro',
        hooks: {
            'astro:config:setup': ({ config, updateConfig, injectScript, logger }) => {
                const { shikiConfig, dual } = withTheme(config.markdown.shikiConfig, theme)
                const { processor } = config.markdown
                const registration = registerPlugins(processor, { features, labels })

                if (!registration) {
                    logger.warn(
                        `markdown processor "${processor.name}" is neither Sätteri nor unified: JAAMD's plugins were not added. Pass them to your processor yourself.`,
                    )
                } else if (registration.total > 0) {
                    logger.info(
                        `markdown processor: ${processor.name}, registered ${registration.added}/${registration.total} plugin(s)`,
                    )
                }

                updateConfig({
                    // Ships TypeScript and an Astro component, compiled by Vite.
                    vite: { ssr: { noExternal: ['@jaamd/astro'] } },
                    markdown: { shikiConfig },
                })

                // "page-ssr": the stylesheets render as <link> tags in every page's <head>.
                injectScript(
                    'page-ssr',
                    [
                        ...(defaultVariables ? [`import ${STYLES.variables};`] : []),
                        ...(dual ? [`import ${STYLES.shikiDual};`] : []),
                        `import ${STYLES.markdown};`,
                    ].join('\n'),
                )

                // Again on every View Transitions navigation, releasing the previous run.
                injectScript(
                    'page',
                    [
                        `import { enhance } from ${CLIENT};`,
                        `let dispose;`,
                        `const run = () => { dispose?.(); dispose = enhance(${JSON.stringify(selector)}, ${client}); };`,
                        `run();`,
                        `document.addEventListener("astro:page-load", run);`,
                    ].join('\n'),
                )
            },
        },
    }
}
