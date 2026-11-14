import jaamd from '@jaamd/astro'
import { defineConfig } from 'astro/config'

export default defineConfig({
    integrations: [jaamd({ labels: { headingLink: 'Lien vers la section' } })],
    vite: { build: { cssMinify: false } },
})
