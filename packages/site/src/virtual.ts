const SITE_ID = 'virtual:jaamd/site'
const RESOLVED_SITE = '\0' + SITE_ID

const LLMS_ID = 'virtual:jaamd/llms'
const RESOLVED_LLMS = '\0' + LLMS_ID

const USER_CSS_ID = 'virtual:jaad/user.css'
const RESOLVED_USER_CSS = '\0' + USER_CSS_ID

const THEME_CSS_ID = 'virtual:jaad/theme.css'
const RESOLVED_THEME_CSS = '\0' + THEME_CSS_ID

// Which way the palette travels between JAAD and JAAMD; always one of the two.
const BRIDGE_CSS_ID = 'virtual:jaad/bridge.css'

const TAILWIND_CSS_ID = 'virtual:jaad/tailwind.css'
const RESOLVED_TAILWIND_CSS = '\0' + TAILWIND_CSS_ID

export interface SiteStylesheets {
    user: string | null
    theme: string | null
    bridge: string
    tailwind: string | null
}

/** A package's llms module, under the heading it takes in the root file. */
export interface LlmsSource {
    label: string
    module: string
}

/** A module whose default export is `value()`, serialised when it is first
 *  loaded: by then every package has registered. */
export function serialisedModule(name: string, id: string, value: () => object) {
    const resolved = '\0' + id

    return {
        name,
        resolveId(source: string) {
            return source === id ? resolved : null
        },
        load(id: string) {
            return id === resolved ? `export default ${JSON.stringify(value())};` : null
        },
    }
}

/** The llms modules of the packages, as `{ label, module }` in site order. */
function llmsModule(sources: LlmsSource[]): string {
    const imports = sources.map((source, at) => {
        return `import * as m${at} from ${JSON.stringify(source.module)};`
    })
    const entries = sources.map((source, at) => {
        return `{ label: ${JSON.stringify(source.label)}, module: m${at} }`
    })
    return [...imports, `export default [${entries.join(', ')}];`].join('\n')
}

/** The resolved site config, the llms modules, and the stylesheets the site
 *  may or may not have. */
export function siteVirtualPlugin(config: () => object, stylesheets: SiteStylesheets, llms: LlmsSource[]) {
    const site = serialisedModule('jaamd:site-config', SITE_ID, config)

    return {
        name: 'jaamd:site',
        resolveId(source: string) {
            if (source === SITE_ID) {
                return site.resolveId(source)
            }
            if (source === LLMS_ID) {
                return RESOLVED_LLMS
            }
            // Redirecting to the real path lets Vite process it as ordinary CSS.
            if (source === USER_CSS_ID) {
                return stylesheets.user ?? RESOLVED_USER_CSS
            }
            if (source === THEME_CSS_ID) {
                return stylesheets.theme ?? RESOLVED_THEME_CSS
            }
            if (source === BRIDGE_CSS_ID) {
                return stylesheets.bridge
            }
            if (source === TAILWIND_CSS_ID) {
                return stylesheets.tailwind ?? RESOLVED_TAILWIND_CSS
            }
            return null
        },
        load(id: string) {
            if (id === RESOLVED_SITE) {
                return site.load(id)
            }
            if (id === RESOLVED_LLMS) {
                return llmsModule(llms)
            }
            if (id === RESOLVED_USER_CSS || id === RESOLVED_THEME_CSS || id === RESOLVED_TAILWIND_CSS) {
                return ''
            }
            return null
        },
    }
}
