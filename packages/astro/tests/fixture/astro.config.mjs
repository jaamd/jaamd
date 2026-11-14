import { unified } from '@astrojs/markdown-remark'
import jaamd from '@jaamd/astro'
import { defineConfig } from 'astro/config'

// `JAAMD_PROCESSOR=unified` builds on unified. Default: Sätteri.
const onUnified = process.env.JAAMD_PROCESSOR === 'unified'

export default defineConfig({
    ...(onUnified ? { markdown: { processor: unified() } } : {}),
    integrations: [jaamd({ theme: { light: 'github-light', dark: 'one-dark-pro' } })],
})
