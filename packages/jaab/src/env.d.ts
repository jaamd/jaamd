/// <reference types="astro/client" />
/// <reference types="@jaamd/site/env.d.ts" />

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
