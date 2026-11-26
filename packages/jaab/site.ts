import type { JaabUserConfig } from './src/config.ts'
import { defineSite, loadConfigFile } from '@jaamd/site/astro-config.ts'
import jaab from './index.ts'

const options = await loadConfigFile<JaabUserConfig>('jaab')

/** The whole Astro config for a JAAB site, from `jaab.config.ts`. */
export default defineSite(options, jaab(options))
