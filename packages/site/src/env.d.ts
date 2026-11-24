/// <reference types="astro/client" />

// Served by the package that registers the site: it holds at least the site's fields.
declare module 'virtual:jaad/config' {
    // oxlint-disable-next-line typescript/consistent-type-imports
    const config: import('./config.ts').SiteResolvedConfig
    export default config
}
