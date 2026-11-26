/// <reference types="astro/client" />

declare module 'virtual:jaab/config' {
    // oxlint-disable-next-line typescript/consistent-type-imports
    const config: import('./config.ts').JaabResolvedConfig
    export default config
}

// The project's layout, or the blog's own.
declare module 'virtual:jaab/layout' {
    // oxlint-disable-next-line typescript/consistent-type-imports
    const Layout: (props: import('./layout.ts').BlogLayoutProps) => unknown
    export default Layout
}

// The site's own fields, as `@jaamd/site` reads them.
declare module 'virtual:jaamd/site' {
    // oxlint-disable-next-line typescript/consistent-type-imports
    const config: import('@jaamd/site/config.ts').SiteModuleConfig
    export default config
}

declare module 'virtual:jaamd/llms' {
    // oxlint-disable-next-line typescript/consistent-type-imports
    const sources: import('@jaamd/site/llms-root.ts').LlmsSourceModule[]
    export default sources
}
