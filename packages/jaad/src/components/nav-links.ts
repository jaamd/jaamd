import config from 'virtual:jaad/config'
import { getSectionLinks } from '../collection.ts'
import { withDeploymentBase } from '../urls.ts'

export interface NavLink {
    label: string
    href: string
    current: boolean
    external: boolean
}

/** The sections, then the configured links. */
export async function navLinks(locale?: string, section?: string): Promise<NavLink[]> {
    return [
        ...(await getSectionLinks(locale)).map(({ key, label, href }) => ({
            label,
            href,
            current: key === section,
            external: false,
        })),
        ...config.nav.map((link) => ({
            label: link.label,
            href: withDeploymentBase(link.href, import.meta.env.BASE_URL),
            current: false,
            external: link.href.startsWith('http'),
        })),
    ]
}
