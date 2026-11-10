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
    routeBase: '/docs/jaad',
    description: 'An Astro integration that turns a folder of Markdown into a documentation site.',
    ogImage: '/og-jaad.png',
    nav: [
        { label: 'jaamd', href: '/docs/jaamd' },
        { label: 'jaad', href: '/docs/jaad' },
    ],
    tailwind: true,
    astro: {
        integrations: [shikiMultiTheme],
        redirects: {
            '/docs': '/docs/jaamd',
        },
    },
})
