import type { AstroIntegration } from 'astro'
import { defineJaadConfig } from '@jaamd/jaad'
import { shikiThemes } from './src/themes.ts'

/** Bakes every showcase theme into the code blocks, so the picker can switch them with CSS. */
const shikiMultiTheme: AstroIntegration = {
    name: 'site:shiki-themes',
    hooks: {
        'astro:config:setup': ({ updateConfig }) => {
            updateConfig({ markdown: { shikiConfig: { themes: shikiThemes, defaultColor: false } } })
        },
    },
}

export default defineJaadConfig({
    site: 'https://jaamd.org',
    title: 'JAAMD',
    lang: 'en',
    routeBase: '/docs',
    sections: {
        jaamd: { dir: '../packages/astro/docs', label: 'JAAMD' },
        jaad: { dir: '../packages/jaad/docs', label: 'JAAD' },
    },
    description: 'Markdown plugins, enhancements and styles for Astro, and a documentation site built on them.',
    ogImage: '/og-jaad.png',
    tailwind: true,
    astro: {
        integrations: [shikiMultiTheme],
    },
})
