import { defineJaadConfig } from '@jaamd/jaad'
import { fontProviders } from 'astro/config'

export default defineJaadConfig({
    site: 'https://docs.example.com',
    title: 'Fixture',
    lang: 'en',
    routeBase: '/docs',
    description: 'Build fixture for the jaad package tests.',
    tailwind: true,
    astro: {
        redirects: {
            '/docs/retired': '/docs/markdown',
        },
        fonts: [
            {
                provider: fontProviders.local(),
                name: 'Fixture Mono',
                cssVariable: '--font-fixture-mono',
                options: {
                    variants: [
                        {
                            weight: '400',
                            style: 'normal',
                            src: [new URL('../../../site/src/fonts/inter.woff2', import.meta.url)],
                        },
                    ],
                },
            },
        ],
    },
})
