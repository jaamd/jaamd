const MODULE_ID = 'virtual:jaad/config'
const RESOLVED_ID = '\0' + MODULE_ID

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

/** The resolved config, serialised, and the stylesheets the site may or may not have. */
export function siteVirtualPlugin(config: object, stylesheets: SiteStylesheets) {
    return {
        name: 'jaad:virtual',
        resolveId(source: string) {
            if (source === MODULE_ID) return RESOLVED_ID
            // Redirecting to the real path lets Vite process it as ordinary CSS.
            if (source === USER_CSS_ID) return stylesheets.user ?? RESOLVED_USER_CSS
            if (source === THEME_CSS_ID) return stylesheets.theme ?? RESOLVED_THEME_CSS
            if (source === BRIDGE_CSS_ID) return stylesheets.bridge
            if (source === TAILWIND_CSS_ID) return stylesheets.tailwind ?? RESOLVED_TAILWIND_CSS
            return null
        },
        load(id: string) {
            if (id === RESOLVED_ID) return `export default ${JSON.stringify(config)};`
            if (id === RESOLVED_USER_CSS || id === RESOLVED_THEME_CSS || id === RESOLVED_TAILWIND_CSS) return ''
            return null
        },
    }
}
