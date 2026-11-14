import type { ShikiConfig } from 'astro'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { withTheme } from '../src/shiki.ts'

const astroDefault = { theme: 'github-dark', themes: {} } as unknown as ShikiConfig

test("Astro's own default becomes github-light", () => {
    assert.deepEqual(withTheme(astroDefault), { shikiConfig: { ...astroDefault, theme: 'github-light' }, dual: false })
})

test('a theme set in shikiConfig stays when the option is unset', () => {
    const configured = { ...astroDefault, theme: 'nord' } as ShikiConfig
    assert.equal(withTheme(configured).shikiConfig.theme, 'nord')

    const themes = { ...astroDefault, themes: { light: 'min-light' } } as unknown as ShikiConfig
    assert.equal(withTheme(themes).shikiConfig.theme, 'github-dark')
})

test('the option replaces the configured theme', () => {
    assert.equal(withTheme({ ...astroDefault, theme: 'nord' } as ShikiConfig, 'dracula').shikiConfig.theme, 'dracula')
})

test('light and dark set both themes without a default colour', () => {
    const { shikiConfig, dual } = withTheme(astroDefault, { light: 'github-light', dark: 'github-dark' })
    assert.equal(dual, true)
    assert.equal(shikiConfig.theme, undefined)
    assert.deepEqual(shikiConfig.themes, { light: 'github-light', dark: 'github-dark' })
    assert.equal(shikiConfig.defaultColor, false)
})

test('the configuration passed in is left as it is', () => {
    const current = { ...astroDefault }
    withTheme(current, { light: 'a', dark: 'b' })
    assert.deepEqual(current, astroDefault)
})
