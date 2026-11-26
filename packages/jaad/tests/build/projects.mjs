import { fileURLToPath } from 'node:url'
import { projectsIn } from '../../../../tests/projects.mjs'

export { built, inline } from '../../../../tests/projects.mjs'

// Inside the fixture, so the projects resolve astro and JAAD from its node_modules.
const FIXTURE = fileURLToPath(new URL('../fixture', import.meta.url))

export const { project, removeProjects } = projectsIn(FIXTURE, {
    'src/content.config.ts': "export { collections } from '@jaamd/jaad/content'\n",
})
