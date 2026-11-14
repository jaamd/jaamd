import type { AstroConfig } from 'astro'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { rehypeHeadingLinks, remarkAlert, remarkToc } from '@jaamd/core/unified'
import { registerPlugins, satteriPlugins, unifiedPlugins } from '../src/processors.ts'

type Processor = AstroConfig['markdown']['processor']

const satteri = (options: object = {}) =>
    ({ name: 'satteri', options: { mdastPlugins: [], hastPlugins: [], features: {}, ...options } }) as Processor & {
        options: { mdastPlugins: { name?: string }[]; hastPlugins: unknown[]; features: Record<string, unknown> }
    }

const unified = (options: object = {}) =>
    ({ name: 'unified', options: { remarkPlugins: [], rehypePlugins: [], ...options } }) as Processor & {
        options: { remarkPlugins: unknown[]; rehypePlugins: unknown[] }
    }

const names = (entries: unknown[]): string[] =>
    entries.flatMap((entry) =>
        Array.isArray(entry)
            ? names(entry)
            : typeof entry === 'function'
              ? [entry.name]
              : typeof entry === 'string'
                ? [entry.split('/').pop()!]
                : entry && typeof entry === 'object' && 'name' in entry
                  ? [String(entry.name)]
                  : [],
    )

test('Sätteri: blocks ahead of the user, the directive fallback last, the hast plugins after the user', () => {
    const user = { name: 'user' }
    const processor = satteri({ mdastPlugins: [user], hastPlugins: [user] })
    const registration = registerPlugins(processor)

    assert.deepEqual(names(processor.options.mdastPlugins), [
        'jaamd-alert',
        'jaamd-code-tabs',
        'jaamd-toc',
        'jaamd-spoiler',
        'user',
        'jaamd-directive-fallback',
    ])
    assert.deepEqual(names(processor.options.hastPlugins).slice(0, 2), ['user', 'jaamd-table-wrapper'])
    assert.equal(names(processor.options.hastPlugins).at(-1), 'jaamd-heading-links')
    assert.equal(processor.options.features.directive, true)
    assert.deepEqual(registration, { added: 7, total: 7 })
})

test('Sätteri: a second run adds nothing', () => {
    const processor = satteri()
    registerPlugins(processor)
    const before = [...processor.options.mdastPlugins]
    assert.deepEqual(registerPlugins(processor), { added: 0, total: 7 })
    assert.deepEqual(processor.options.mdastPlugins, before)
})

test('unified: remark ahead of the user, Astro ids right before the links', () => {
    const user = function user() {}
    const processor = unified({ remarkPlugins: [user], rehypePlugins: [user] })
    registerPlugins(processor)

    assert.deepEqual(names(processor.options.remarkPlugins), [
        'remarkAlert',
        'remarkDirective',
        'remarkCodeTabs',
        'remarkToc',
        'remarkSpoiler',
        'user',
    ])
    assert.deepEqual(names(processor.options.rehypePlugins), [
        'user',
        'rehypeTableWrapper',
        'rehype-heading-ids.js',
        'rehypeHeadingLinks',
    ])
})

test('unified: plugins the user registered are not added again, ids included', () => {
    const processor = unified({ remarkPlugins: [remarkAlert, [remarkToc, {}]], rehypePlugins: [rehypeHeadingLinks] })
    const registration = registerPlugins(processor)

    assert.equal(names(processor.options.remarkPlugins).filter((name) => name === 'remarkAlert').length, 1)
    assert.equal(names(processor.options.remarkPlugins).filter((name) => name === 'remarkToc').length, 1)
    assert.deepEqual(names(processor.options.rehypePlugins), ['rehypeHeadingLinks', 'rehypeTableWrapper'])
    assert.deepEqual(registration, { added: 4, total: 8 })
})

test('features turn plugins off on both processors', () => {
    const features = { alerts: false, codeTabs: false, toc: false, spoilers: false, directives: false }

    const s = satteri()
    registerPlugins(s, { features })
    assert.deepEqual(names(s.options.mdastPlugins), [])
    assert.equal(s.options.features.directive, undefined)

    const u = unified()
    registerPlugins(u, { features })
    assert.deepEqual(u.options.remarkPlugins, [])
})

test('another processor is left alone', () => {
    assert.equal(registerPlugins({ name: 'mdx', options: {} } as unknown as Processor), null)
})

test('the presets for manual setup carry the labels', () => {
    const { rehypePlugins } = unifiedPlugins({ labels: { headingLink: 'Lien' } })
    assert.deepEqual(rehypePlugins.at(-1), [rehypeHeadingLinks, { label: 'Lien' }])
    assert.equal(satteriPlugins().features.directive, true)
})
