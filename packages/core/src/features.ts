/** What JAAMD adds to markdown, each of which can be turned off. */
export const FEATURES = [
    'alerts',
    'codeTabs',
    'toc',
    'spoilers',
    'directives',
    'tables',
    'headingLinks',
    'copyButtons',
    'lightbox',
] as const

export type Feature = (typeof FEATURES)[number]

/** Unset is on. */
export type Features = Partial<Record<Feature, boolean>>

export type ResolvedFeatures = Record<Feature, boolean>

/** Every feature, with `directives` forced on while a block written in it is. */
export function resolveFeatures(features: Features = {}): ResolvedFeatures {
    const resolved = Object.fromEntries(FEATURES.map((name) => [name, features[name] ?? true])) as ResolvedFeatures
    return { ...resolved, directives: resolved.directives || resolved.codeTabs || resolved.toc || resolved.spoilers }
}
