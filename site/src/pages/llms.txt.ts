import pkg from '../../../packages/astro/package.json'

const pages = import.meta.glob<string>('../../../packages/astro/docs/**/*.md', {
    query: '?raw',
    import: 'default',
    eager: true,
})

/** The package documentation as plain text for language models: a title and
 *  summary, then every page in file order. */
export const GET = () => {
    const body = Object.keys(pages)
        .toSorted()
        .map((path) => pages[path].trim())
        .join('\n\n')
    return new Response(`# jaamd\n\n> ${pkg.description}\n\n${body}\n`, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
}
