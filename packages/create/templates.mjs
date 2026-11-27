const JAAD = { name: 'JAAD', package: '@jaamd/jaad' }
const JAAB = { name: 'JAAB', package: '@jaamd/jaab' }

const JAAD_FILES = {
    astroConfig: 'export { default } from "@jaamd/jaad/site";\n',
    contentConfig: 'export { collections } from "@jaamd/jaad/content";\n',
    config: { name: 'jaad.config', label: 'JAAD configuration' },
    setupUrl: 'https://docs.jaamd.org/jaad/getting-started/installation#existing-astro-project',
}

const JAAB_SETUP_URL = 'https://docs.jaamd.org/jaab/getting-started/installation'

/**
 * What each template writes. `layers` are directories of `templates/`, copied
 * in order, a later one winning over an earlier one. The Astro and content
 * configs are kept here, whole: `--here` recognises a project it set up by
 * comparing them. `config` is the file of the package's own options, which
 * `--here` keeps when the project has one.
 */
export const TEMPLATES = {
    docs: {
        label: 'Documentation site',
        hint: 'docs at /',
        dir: 'my-docs',
        products: [JAAD],
        layers: ['_shared', '_docs', 'docs'],
        samples: ['docs/01-introduction.md'],
        ...JAAD_FILES,
    },
    site: {
        label: 'Website with documentation',
        hint: 'landing page at /, docs at /docs',
        dir: 'my-site',
        products: [JAAD],
        layers: ['_shared', 'site'],
        samples: ['docs/01-introduction.md'],
        ...JAAD_FILES,
        // Its own config moves the docs off the root; one already there would not.
        configConflict: 'cannot add a landing page: it needs routeBase: "/docs"',
    },
    blog: {
        label: 'Blog',
        hint: 'posts at /',
        dir: 'my-blog',
        products: [JAAB],
        layers: ['_shared', '_blog', 'blog'],
        samples: ['blog/hello-world.md'],
        astroConfig: 'export { default } from "@jaamd/jaab/site";\n',
        contentConfig: 'export { collections } from "@jaamd/jaab/content";\n',
        config: { name: 'jaab.config', label: 'JAAB configuration' },
        setupUrl: JAAB_SETUP_URL,
        // The blog's index is served at /, where JAAB stops the build over a page of the project.
        rootConflict: 'serves the blog index at /: move the page, or use the docs-blog template for a blog at /blog',
    },
    'docs-blog': {
        label: 'Docs and a blog',
        hint: 'docs at /, blog at /blog',
        dir: 'my-site',
        products: [JAAD, JAAB],
        layers: ['_shared', '_docs', '_blog', 'docs-blog'],
        samples: ['docs/01-introduction.md', 'blog/hello-world.md'],
        astroConfig: [
            'import jaab from "@jaamd/jaab";',
            'import jaad from "@jaamd/jaad";',
            'import { defineConfig } from "astro/config";',
            'import site from "./site.config.ts";',
            '',
            'export default defineConfig({',
            '  integrations: [',
            '    jaad({ ...site, routeBase: "/" }),',
            '    jaab({ ...site, routeBase: "/blog" }),',
            '  ],',
            '});',
            '',
        ].join('\n'),
        contentConfig: [
            'import { collections as blog } from "@jaamd/jaab/content";',
            'import { collections as docs } from "@jaamd/jaad/content";',
            '',
            'export const collections = { ...docs, ...blog };',
            '',
        ].join('\n'),
        config: { name: 'site.config', label: 'site configuration' },
        setupUrl: `${JAAB_SETUP_URL}#docs-and-a-blog`,
    },
}

/** The entry points: `npm create @jaamd`, and `npm create @jaamd/jaad`, kept
 *  for the projects and scripts that run it, with the templates it always had. */
export const PRESETS = {
    jaamd: {
        command: 'create-jaamd',
        create: '@jaamd',
        templates: ['docs', 'site', 'blog', 'docs-blog'],
        defaultTemplate: null,
        name: 'JAAMD',
        tagline: 'Write markdown. Get docs, a blog, or both.',
        icon: '📝',
        outro: 'Happy writing! ✨',
    },
    jaad: {
        command: 'create-jaad',
        create: '@jaamd/jaad',
        templates: ['docs', 'site'],
        defaultTemplate: 'docs',
        name: 'JAAD',
        tagline: 'Just Another Astro Docs — Write markdown. Get docs.',
        icon: '📚',
        outro: 'Happy documenting! ✨',
    },
}

/** The preset of an entry point, by its key in `PRESETS`. */
export function presetOf(key) {
    const preset = PRESETS[key]
    if (!preset) {
        throw new Error(`unknown preset ${key}; available: ${Object.keys(PRESETS).join(', ')}`)
    }
    return preset
}

/** What the template installs, as the messages name it: "JAAD", or "JAAD and JAAB". */
export function productOf(template) {
    return TEMPLATES[template].products
        .map((product) => {
            return product.name
        })
        .join(' and ')
}

/** The directories a template writes markdown in: `docs`, `blog`, or both. */
export function contentDirsOf(template) {
    return TEMPLATES[template].samples.map((sample) => {
        return sample.split('/')[0]
    })
}
