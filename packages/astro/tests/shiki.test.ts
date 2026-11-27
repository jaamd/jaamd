import type { AstroConfig } from 'astro'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mergeConfig } from 'astro/config'
import { withTheme, type ShikiTheme } from '../src/shiki.ts'

type ShikiConfig = AstroConfig['markdown']['shikiConfig']

const transformer = { name: 'project-transformer' }

const astroDefault = {
    theme: 'github-dark',
    themes: {},
    langs: ['zig'],
    transformers: [transformer],
} as unknown as ShikiConfig

/** `shikiConfig` once Astro merges the update into it, as `updateConfig` does. */
const applied = (current: ShikiConfig, theme?: ShikiTheme) => {
    const { shikiConfig } = withTheme(current, theme)
    const merged = mergeConfig({ markdown: { shikiConfig: current } }, { markdown: { shikiConfig } })
    return merged.markdown.shikiConfig as ShikiConfig
}

test("Astro's own default becomes github-light", () => {
    assert.equal(applied(astroDefault).theme, 'github-light')
})

test('a theme set in shikiConfig stays when the option is unset', () => {
    assert.equal(applied({ ...astroDefault, theme: 'nord' } as ShikiConfig).theme, 'nord')

    const themes = { ...astroDefault, themes: { light: 'min-light' } } as unknown as ShikiConfig
    assert.deepEqual(withTheme(themes).shikiConfig, {})
})

test('the option replaces the configured theme', () => {
    assert.equal(applied({ ...astroDefault, theme: 'nord' } as ShikiConfig, 'dracula').theme, 'dracula')
})

test('light and dark set both themes without a default colour', () => {
    const { dual } = withTheme(astroDefault, { light: 'github-light', dark: 'github-dark' })
    const shikiConfig = applied(astroDefault, { light: 'github-light', dark: 'github-dark' })
    assert.equal(dual, true)
    assert.deepEqual(shikiConfig.themes, { light: 'github-light', dark: 'github-dark' })
    assert.equal(shikiConfig.defaultColor, false)
})

test("the project's transformers and languages are not added again", () => {
    for (const theme of [undefined, 'nord', { light: 'github-light', dark: 'github-dark' }]) {
        const shikiConfig = applied(astroDefault, theme)
        assert.deepEqual(shikiConfig.transformers, [transformer])
        assert.deepEqual(shikiConfig.langs, ['zig'])
    }
})

test('a theme name is not applied over configured themes, and says why', () => {
    const themes = { ...astroDefault, themes: { light: 'min-light', dark: 'min-dark' } } as unknown as ShikiConfig
    const update = withTheme(themes, 'dracula')
    assert.deepEqual(update.shikiConfig, {})
    assert.match(update.ignored ?? '', /theme "dracula" was not applied: markdown\.shikiConfig\.themes is set/)
})

test('light and dark need both themes', () => {
    const update = withTheme(astroDefault, { light: 'github-light', dark: '' })
    assert.deepEqual(update.shikiConfig, {})
    assert.equal(update.dual, false)
    assert.match(update.ignored ?? '', /both a light and a dark theme/)
})

test('the configuration passed in is left as it is', () => {
    const current = { ...astroDefault }
    withTheme(current, { light: 'a', dark: 'b' })
    assert.deepEqual(current, astroDefault)
})
