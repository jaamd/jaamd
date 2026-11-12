import jaamd from '@jaamd/astro'
import { defineConfig } from 'astro/config'

export default defineConfig({
    integrations: [jaamd()],
    vite: { build: { cssMinify: false } },
})
