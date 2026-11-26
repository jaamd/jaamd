import type { SiteResolvedConfig } from './config.ts'
import { FORGES, forgeForUrl } from './forges.ts'

export interface SocialLink {
    href: string
    label: string
    /** Bundled forge icon. */
    path?: string | undefined
    /** User-supplied markup, which wins over the bundled icon. */
    svg?: string | undefined
}

/** The configured links, plus the inferred repository unless already listed. */
export function buildSocialLinks(config: SiteResolvedConfig): SocialLink[] {
    const links: SocialLink[] = []

    for (const [key, value] of Object.entries(config.social)) {
        const entry = typeof value === 'string' ? { href: value } : value
        const forge = FORGES[key]
        links.push({
            href: entry.href,
            label: ('label' in entry ? entry.label : undefined) ?? forge?.label ?? key,
            path: forge?.path,
            svg: 'svg' in entry ? entry.svg : undefined,
        })
    }

    const namedAForge = Object.keys(config.social).some((key) => {
        return key in FORGES
    })

    if (
        config.repoUrl &&
        !namedAForge &&
        !links.some((l) => {
            return l.href === config.repoUrl
        })
    ) {
        const name = forgeForUrl(config.repoUrl)
        const forge = name ? FORGES[name] : undefined
        links.push({
            href: config.repoUrl,
            label: forge?.label ?? 'Repository',
            path: forge?.path,
        })
    }

    return links
}
