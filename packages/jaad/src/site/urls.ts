/** Empty at the site root, otherwise one leading slash and no trailing slash. */
export function normaliseBasePath(value: string): string {
    const trimmed = value.replace(/^\/+/, '').replace(/\/+$/, '')
    return trimmed ? `/${trimmed}` : ''
}

/** Apply Astro's deployment base to an application-local, root-relative href. */
export function withDeploymentBase(href: string, deploymentBase: string): string {
    if (!href.startsWith('/') || href.startsWith('//')) return href

    const prefix = normaliseBasePath(deploymentBase)
    if (!prefix) return href
    return href === '/' ? `${prefix}/` : `${prefix}${href}`
}
