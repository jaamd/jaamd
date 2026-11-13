import { defineJaadConfig } from '@jaamd/jaad'

export default defineJaadConfig({
    site: 'https://docs.jaamd.org',
    title: 'JAAMD',
    homeLink: 'https://jaamd.org',
    lang: 'en',
    description: 'Markdown plugins, enhancements and styles for Astro, and a documentation site built on them.',
    docsDir: './content',
    sections: {
        jaamd: { dir: '../packages/astro/docs', label: 'JAAMD' },
        jaad: { dir: '../packages/jaad/docs', label: 'JAAD' },
    },
})
