/** Empty at the site root, otherwise one leading slash and no trailing slash. */
export function normaliseBasePath(value: string): string {
    const trimmed = value.replace(/^\/+/, '').replace(/\/+$/, '')
    return trimmed ? `/${trimmed}` : ''
}

/** Apply Astro's deployment base to an application-local, root-relative href. */
export function withDeploymentBase(href: string, deploymentBase: string): string {
    if (!href.startsWith('/') || href.startsWith('//')) {
        return href
    }

    const prefix = normaliseBasePath(deploymentBase)
    if (!prefix) {
        return href
    }
    return href === '/' ? `${prefix}/` : `${prefix}${href}`
}

/** Whether Astro builds page urls with a trailing slash: always with
 *  `trailingSlash: 'always'`, and with `'ignore'` when every page is a directory. */
export function pageUrlsEndWithSlash(astro: { trailingSlash: string; build: { format: string } }): boolean {
    if (astro.trailingSlash === 'always') {
        return true
    }
    return astro.trailingSlash === 'ignore' && astro.build.format === 'directory'
}
