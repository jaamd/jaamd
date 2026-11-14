import { defineConfig, fontProviders } from 'astro/config'

export default defineConfig({
    site: 'https://jaamd.org',
    fonts: [
        {
            provider: fontProviders.google(),
            name: 'Inter',
            cssVariable: '--font-inter',
            weights: ['300 600'],
            styles: ['normal'],
            subsets: ['latin'],
        },
        {
            provider: fontProviders.google(),
            name: 'Merriweather',
            cssVariable: '--font-merriweather',
            weights: [300, 700],
            styles: ['normal', 'italic'],
            subsets: ['latin'],
        },
    ],
})
