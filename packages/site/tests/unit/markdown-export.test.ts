import assert from 'node:assert/strict'
import { test } from 'node:test'
import { builtImageUrls, exportMarkdown, sourceKey, type MarkdownExportContext } from '../../src/markdown-export.ts'

const CONTEXT: MarkdownExportContext = {
    markdownUrls: new Map([
        ['docs/guides/01-setup.md', 'https://d.dev/guides/setup.md'],
        ['docs/02-reference.md', 'https://d.dev/reference.md'],
    ]),
    origin: 'https://d.dev',
}

const PAGE = { title: 'Guide', filePath: 'docs/guides/03-guide.md' }

const exported = (body: string, context: MarkdownExportContext = CONTEXT, page: object = {}) => {
    return exportMarkdown({ ...PAGE, body, ...page }, context)
}

test('a page without an h1 opens with its title, then its frontmatter description', () => {
    assert.match(
        exported('Some text.', CONTEXT, { description: 'How to start.' }),
        /^# Guide\n\n> How to start\.\n\nSome text\./,
    )
})

test('a page with an h1 keeps it, and the description follows it', () => {
    const markdown = exported('Before.\n\n# Own title\n\nText.', CONTEXT, { description: 'Short.' })
    assert.match(markdown, /^Before\.\n\n# Own title\n\n> Short\.\n\nText\./)
    assert.doesNotMatch(markdown, /# Guide/)
})

test('links to other pages lead to their Markdown, anchors and references included', () => {
    const markdown = exported('[Setup](./01-setup.md#install) and [ref][r].\n\n[r]: ../02-reference.md')
    assert.match(markdown, /\[Setup\]\(https:\/\/d\.dev\/guides\/setup\.md#install\)/)
    assert.match(markdown, /\[r\]: https:\/\/d\.dev\/reference\.md/)
})

test('root-relative links and images get the origin, without one they stay as written', () => {
    assert.match(
        exported('[Home](/) ![Logo](/logo.svg)'),
        /\[Home\]\(https:\/\/d\.dev\/\) !\[Logo\]\(https:\/\/d\.dev\/logo\.svg\)/,
    )
    assert.match(exported('[Home](/)', { ...CONTEXT, origin: null }), /\[Home\]\(\/\)/)
})

test('a local image leads where the build put it', () => {
    const images = new Map([['./shot.png', '/_astro/shot.Ab12.webp']])
    const markdown = exported('![Shot](./shot.png) ![Other](./other.png)\n\n![Ref][s]\n\n[s]: ./shot.png', CONTEXT, {
        images,
    })
    assert.match(markdown, /!\[Shot\]\(https:\/\/d\.dev\/_astro\/shot\.Ab12\.webp\)/)
    assert.match(markdown, /!\[Other\]\(\.\/other\.png\)/)
    assert.match(markdown, /\[s\]: https:\/\/d\.dev\/_astro\/shot\.Ab12\.webp/)
})

// Astro leaves a placeholder for each local image, and fills it in on render.
test('the built images pair with the placeholders in order, raw images included', () => {
    const placeholder = (src: string) => {
        return `<img __ASTRO_IMAGE_="{&quot;alt&quot;:&quot;A&quot;,&quot;src&quot;:&quot;${src}&quot;,&quot;index&quot;:0}">`
    }
    const collection = `<p>${placeholder('./a.png')}<img src="/raw.png">${placeholder('./b&amp;c.png')}</p>`
    const rendered =
        '<p><img src="/_astro/a.1.webp" alt="A"><img src="/raw.png"><img alt="A" src="/_astro/b.2.webp?x=1&amp;y=2"></p>'

    assert.deepEqual(
        builtImageUrls(collection, rendered),
        new Map([
            ['./a.png', '/_astro/a.1.webp'],
            ['./b&c.png', '/_astro/b.2.webp?x=1&y=2'],
        ]),
    )
    // Tags that do not line up pair nothing, rather than the wrong images.
    assert.deepEqual(builtImageUrls(collection, '<p><img src="/_astro/a.1.webp"></p>'), new Map())
})

test('links that are not to a known page are left alone', () => {
    const markdown = exported('[a](https://x.dev) [b](#here) [c](./missing.md) [d](./file.pdf)')
    assert.match(markdown, /\[a\]\(https:\/\/x\.dev\) \[b\]\(#here\) \[c\]\(\.\/missing\.md\) \[d\]\(\.\/file\.pdf\)/)
})

test('code tabs become labelled code blocks, without their annotations', () => {
    const markdown = exported(':::code-tabs\n\n```bash npm {1}\nnpm i x\n```\n\n```bash\npnpm add x\n```\n\n:::')
    assert.match(markdown, /\*\*npm\*\*\n\n```bash\nnpm i x\n```\n\n\*\*bash\*\*\n\n```bash\npnpm add x\n```/)
    assert.doesNotMatch(markdown, /:::|\{1\}/)
})

test('the table of contents goes, a spoiler is plain text, other directives keep what they say', () => {
    const markdown = exported(':::toc\n:::\n\nThe butler :spoiler[did it] at 10:30.\n\n:::note\nInner **text**.\n:::')
    assert.doesNotMatch(markdown, /toc|:::|spoiler/)
    assert.match(markdown, /The butler did it at 10:30\./)
    assert.match(markdown, /Inner \*\*text\*\*\./)
})

test('GitHub alerts are written as they came', () => {
    assert.match(exported('> [!NOTE]\n> Keep it short.'), /> \[!NOTE\]\n> Keep it short\./)
})

test('a source file is the same key however its path is spelled', () => {
    assert.equal(sourceKey('./docs/a.md'), 'docs/a.md')
    assert.equal(sourceKey('docs\\guides\\a.md'), 'docs/guides/a.md')
    assert.equal(sourceKey('docs/guides/../a.md'), 'docs/a.md')
})
