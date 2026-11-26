import type { JaadUserConfig } from './src/config.ts'
import { defineSite, loadConfigFile } from '@jaamd/site/astro-config.ts'
import jaad from './index.ts'

const options = await loadConfigFile<JaadUserConfig>('jaad')

/** The whole Astro config for a JAAD site, from `jaad.config.ts`. */
export default defineSite(options, jaad(options))
