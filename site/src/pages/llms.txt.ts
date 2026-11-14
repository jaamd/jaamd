/** Where the documentation for language models is. */
export const GET = () =>
    new Response(
        [
            '# JAAMD',
            '',
            '> Markdown, refined: alerts, code tabs, a table of contents, spoilers, heading anchors, copy buttons, a lightbox and themes.',
            '',
            '- [Documentation](https://docs.jaamd.org/llms.txt): JAAMD and JAAD, page by page',
            '',
        ].join('\n'),
        { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
    )
