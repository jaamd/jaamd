import type { SiteConfig } from './config.ts'
import { readFileSync } from 'node:fs'
import { isDeepStrictEqual } from 'node:util'

/** A package that serves pages on the site, as it describes itself when its
 *  integration is created. */
export interface SiteMember {
    /** As installed, such as `@jaamd/jaad`. */
    package: string
    version: string
    /** Its heading in the root `llms.txt`, such as "Docs". */
    label: string
    /** Where its pages are mounted: empty at the site root. */
    base: string
    /** A module exporting `llmsSection` and `llmsFullPages`; null without llms files. */
    llms: string | null
    /** Its 404 page, served when it is mounted at the root. */
    notFound: string | null
}

/** What one package hands the site integration it includes. */
export interface SiteEntry {
    options: SiteConfig
    /** CSS variables of the fonts set in `astro.fonts`. */
    fonts: string[]
    member: SiteMember
}

/** One copy of the site integration: the version of `@jaamd/site` it comes
 *  from, and the package that included it. */
export interface SiteInstance {
    version: string
    entry: SiteEntry
}

/** The `version` of the package.json at `url`. */
export function packageVersion(url: URL): string {
    const manifest = JSON.parse(readFileSync(url, 'utf8')) as { version: string }
    return manifest.version
}

/** Release order: numbers first, then a release above its prereleases. */
export function compareVersions(a: string, b: string): number {
    const [coreA = '', preA = ''] = a.split('-', 2)
    const [coreB = '', preB = ''] = b.split('-', 2)
    const numbersA = coreA.split('.').map(Number)
    const numbersB = coreB.split('.').map(Number)

    for (let i = 0; i < 3; i++) {
        const difference = (numbersA[i] ?? 0) - (numbersB[i] ?? 0)
        if (difference !== 0) {
            return difference
        }
    }

    if (preA === preB) {
        return 0
    }
    if (preA === '') {
        return 1
    }
    if (preB === '') {
        return -1
    }
    return preA.localeCompare(preB, 'en', { numeric: true })
}

/** The packages are released together and pin `@jaamd/site` exactly: two
 *  versions mean two copies of the site, each with its own shell. */
export function assertOneVersion(instances: SiteInstance[]): void {
    const versions = new Set(
        instances.flatMap((instance) => {
            return [instance.version, instance.entry.member.version]
        }),
    )
    if (versions.size <= 1) {
        return
    }

    const newest = [...versions].toSorted(compareVersions).at(-1)
    const found = instances.map((instance) => {
        const { member } = instance.entry
        return `  ${member.package} ${member.version}, with @jaamd/site ${instance.version}`
    })
    const install = instances.map((instance) => {
        return `${instance.entry.member.package}@${newest}`
    })

    throw new Error(
        'jaamd: the packages of one site must share a version\n' +
            `${found.join('\n')}\n` +
            `Install the same version of each:\n  npm i ${install.join(' ')}`,
    )
}

/** The keys whose values differ between two entries. */
function differingOptions(a: SiteEntry, b: SiteEntry): string[] {
    const keys = new Set([...Object.keys(a.options), ...Object.keys(b.options)])
    const differing = [...keys].filter((key) => {
        const valueA = (a.options as Record<string, unknown>)[key]
        const valueB = (b.options as Record<string, unknown>)[key]
        return !isDeepStrictEqual(valueA, valueB)
    })

    if (!isDeepStrictEqual(a.fonts, b.fonts)) {
        differing.push('astro.fonts')
    }
    return differing
}

/** One site, one set of options: title, theme, header and footer are shared. */
export function assertSameOptions(instances: SiteInstance[]): void {
    const [first, ...rest] = instances
    if (!first) {
        return
    }

    const conflicts = rest.flatMap((instance) => {
        const keys = differingOptions(first.entry, instance.entry)
        if (keys.length === 0) {
            return []
        }
        return [`  ${first.entry.member.package} and ${instance.entry.member.package}: ${keys.join(', ')}`]
    })
    if (conflicts.length === 0) {
        return
    }

    throw new Error(
        'jaamd: the packages of one site set its options differently\n' +
            `${conflicts.join('\n')}\n` +
            'Give each the same site options, for instance from one object they share.',
    )
}

/** Each package once, each at a base of its own. */
export function assertSeparateBases(members: SiteMember[]): void {
    for (const [at, member] of members.entries()) {
        const earlier = members.slice(0, at)

        if (earlier.some((other) => other.package === member.package)) {
            throw new Error(`jaamd: ${member.package} is in the integrations twice. Keep one.`)
        }

        const sharing = earlier.find((other) => other.base === member.base)
        if (sharing) {
            throw new Error(
                `jaamd: ${sharing.package} and ${member.package} both mount their pages at "${member.base || '/'}". ` +
                    'Give each a base of its own.',
            )
        }
    }
}

/** A path another package owns below `member`'s base, relative to that base. */
export interface ReservedPath {
    path: string
    package: string
}

/** The bases of the other packages that sit inside `member`'s own: its
 *  pages must stay out of them. */
export function pathsReservedInside(members: SiteMember[], member: SiteMember): ReservedPath[] {
    const prefix = member.base === '' ? '/' : `${member.base}/`

    return members.flatMap((other) => {
        if (other === member || !other.base.startsWith(prefix)) {
            return []
        }
        return [{ path: other.base.slice(prefix.length), package: other.package }]
    })
}

/** Who serves `/llms.txt`: the only package writing llms files when it is
 *  mounted at the root, the site when there are more or it is not, nobody
 *  when none writes them. */
export function rootLlmsServer(members: SiteMember[]): SiteMember | 'site' | null {
    const writers = members.filter((member) => {
        return member.llms !== null
    })

    const [only, ...others] = writers
    if (!only) {
        return null
    }
    if (others.length === 0 && only.base === '') {
        return only
    }
    return 'site'
}

/** The 404 of the package mounted at the root; elsewhere the project has
 *  pages of its own, and its own 404 with them. */
export function notFoundPage(members: SiteMember[]): string | null {
    const atRoot = members.find((member) => {
        return member.base === ''
    })
    return atRoot?.notFound ?? null
}
