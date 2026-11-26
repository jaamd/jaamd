import { fileURLToPath } from 'node:url'
import { projectsIn } from '../../../../tests/projects.mjs'

export { built, inline } from '../../../../tests/projects.mjs'

// Inside the fixture, so the projects resolve astro, JAAB and JAAD from its node_modules.
const FIXTURE = fileURLToPath(new URL('../fixture', import.meta.url))

/** A blog alone; a project with docs too sets its content config to `BOTH_COLLECTIONS`. */
export const { project, removeProjects } = projectsIn(FIXTURE, {
    'src/content.config.ts': "export { collections } from '@jaamd/jaab/content'\n",
})

/** The collections of a site with docs and a blog, in one content config. */
export const BOTH_COLLECTIONS = [
    "import { collections as docs } from '@jaamd/jaad/content'",
    "import { collections as blog } from '@jaamd/jaab/content'",
    '',
    'export const collections = { ...docs, ...blog }',
    '',
].join('\n')
