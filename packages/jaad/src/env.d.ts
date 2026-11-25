/// <reference types="astro/client" />

declare module 'virtual:jaad/config' {
    // oxlint-disable-next-line typescript/consistent-type-imports
    const config: import('./config.ts').JaadResolvedConfig
    export default config
}

declare module 'virtual:jaad/docs-frame' {
    // oxlint-disable-next-line typescript/consistent-type-imports
    const DocsFrame: typeof import('./docs/layouts/DefaultDocsFrame.astro').default
    export default DocsFrame
}

// The site's own fields, as `@jaamd/site` reads them.
declare module 'virtual:jaamd/site' {
    // oxlint-disable-next-line typescript/consistent-type-imports
    const config: import('@jaamd/site/config.ts').SiteResolvedConfig
    export default config
}

declare module 'virtual:jaamd/llms' {
    // oxlint-disable-next-line typescript/consistent-type-imports
    const sources: import('@jaamd/site/llms-root.ts').LlmsSourceModule[]
    export default sources
}
