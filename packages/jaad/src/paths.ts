import { join } from 'node:path'

/** The project's directories, absolute, as Astro resolves `root`, `publicDir`
 *  and `srcDir`. */
export interface ProjectPaths {
    root: string
    publicDir: string
    srcDir: string
}

/** Astro's default directories below a project root. */
export function projectPaths(root: string): ProjectPaths {
    return { root, publicDir: join(root, 'public'), srcDir: join(root, 'src') }
}

/** A root stands for Astro's default directories below it. */
export function toProjectPaths(project: ProjectPaths | string): ProjectPaths {
    return typeof project === 'string' ? projectPaths(project) : project
}
