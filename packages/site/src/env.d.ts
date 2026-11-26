/// <reference types="astro/client" />

// Served by the site integration, once every package has registered.
declare module 'virtual:jaamd/site' {
    // oxlint-disable-next-line typescript/consistent-type-imports
    const config: import('./config.ts').SiteModuleConfig
    export default config
}

declare module 'virtual:jaamd/llms' {
    // oxlint-disable-next-line typescript/consistent-type-imports
    const sources: import('./llms-root.ts').LlmsSourceModule[]
    export default sources
}
