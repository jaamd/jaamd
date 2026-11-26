import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readBuilt } from '../../../tests/dist.mjs'

export { allCss, brokenLinks, missingFrom, packageClasses, walk } from '../../../tests/dist.mjs'

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
export const DIST = join(ROOT, 'tests', 'fixture', 'dist')

/** A file of the fixture's build, by its path inside `dist`. */
export function built(relative) {
    return readBuilt(DIST, relative)
}
