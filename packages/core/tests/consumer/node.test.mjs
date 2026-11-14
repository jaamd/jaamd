/** The packed tarball in plain Node: no bundler, no framework. */

import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { after, before, describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { cleanupTemporaryDirectories, packPackage, run, temporaryDirectory } from './helpers.mjs'

const CORE = fileURLToPath(new URL('../..', import.meta.url))

const SCRIPT = `
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { satteriPlugins } from '@jaamd/core/satteri'
import { themes } from '@jaamd/core/themes'
import { unifiedPlugins } from '@jaamd/core/unified'
import { enhance } from '@jaamd/core/client'
import rehypeStringify from 'rehype-stringify'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { markdownToHtml } from 'satteri'
import { unified } from 'unified'

const source = '> [!TIP]\\n> Hi.\\n\\n:spoiler[secret]\\n'
const { remarkPlugins, rehypePlugins } = unifiedPlugins()
const viaUnified = String(
    await unified()
        .use(remarkParse)
        .use(remarkPlugins)
        .use(remarkRehype, { allowDangerousHtml: true })
        .use(rehypePlugins)
        .use(rehypeStringify, { allowDangerousHtml: true })
        .process(source),
)
const viaSatteri = await markdownToHtml(source, satteriPlugins())
const css = (specifier) => readFileSync(fileURLToPath(import.meta.resolve(specifier)), 'utf8')

console.log(
    JSON.stringify({
        viaUnified,
        viaSatteri: typeof viaSatteri === 'string' ? viaSatteri : viaSatteri.html,
        themes: themes.map((theme) => theme.slug),
        enhance: typeof enhance,
        styles: css('@jaamd/core/styles.css'),
        defaults: css('@jaamd/core/default.css'),
        dracula: css('@jaamd/core/themes/dracula.css'),
        draculaDark: css('@jaamd/core/themes/dracula/dark.css'),
    }),
)
`

describe('a Node project that installed the packed tarball', () => {
    let output

    before(() => {
        const project = temporaryDirectory('jaamd-core-node-')
        writeFileSync(
            join(project, 'package.json'),
            JSON.stringify({
                name: 'core-consumer-test',
                private: true,
                type: 'module',
                dependencies: {
                    '@jaamd/core': `file:${packPackage(CORE)}`,
                    'rehype-stringify': '^10.0.1',
                    'remark-parse': '^11.0.0',
                    'remark-rehype': '^11.1.2',
                    satteri: '^0.10.5',
                    unified: '^11.0.0',
                },
            }),
        )
        writeFileSync(join(project, 'run.mjs'), SCRIPT)

        run('npm', ['install', '--no-audit', '--no-fund'], project)
        output = JSON.parse(run('node', ['run.mjs'], project))
    })

    after(cleanupTemporaryDirectories)

    test('the unified plugins run', () => {
        assert.match(output.viaUnified, /class="markdown-alert markdown-alert-tip"/)
        assert.match(output.viaUnified, /<span class="jaamd-spoiler">secret<\/span>/)
    })

    test('the Sätteri plugins run', () => {
        assert.match(output.viaSatteri, /class="markdown-alert markdown-alert-tip"/)
        assert.match(output.viaSatteri, /<span class="jaamd-spoiler">secret<\/span>/)
    })

    test('the client module loads without a DOM', () => {
        assert.equal(output.enhance, 'function')
    })

    test('the stylesheets and the themes are files in the package', () => {
        assert.equal(output.themes.length, 8)
        assert.match(output.styles, /\.jaamd-content \{/)
        assert.doesNotMatch(output.styles, /@import/)
        assert.match(output.defaults, /--jaamd-font-size:/)
        assert.match(output.dracula, /^:root \{/m)
        assert.match(output.draculaDark, /^html\.dark \{/m)
    })
})
