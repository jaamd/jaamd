import assert from 'node:assert/strict'
import { test } from 'node:test'
import { UI_CATALOGS, UI_DEFAULTS, UI_KEYS, UI_SUPPORTED_LOCALES, uiString } from '../../src/ui.ts'
import { ITALIAN_UI } from '../../src/ui/it.ts'

test("a locale's override wins over its bundled catalogue", () => {
    const overrides = { it: { 'page.copy': 'Copia la pagina' } }
    assert.equal(uiString(overrides, 'it', 'page.copy'), 'Copia la pagina')
})

// Overriding one string must not replace the rest of the bundled catalogue.
test('what a locale leaves out uses its bundled translation, key by key', () => {
    const overrides = { it: { 'page.copy': 'Copia la pagina' } }
    assert.equal(uiString(overrides, 'it', 'page.edit'), ITALIAN_UI['page.edit'])
})

test('a supported locale needs no overrides', () => {
    assert.equal(uiString({}, 'it', 'search.trigger'), ITALIAN_UI['search.trigger'])
})

test('an unsupported locale falls back to the english default', () => {
    assert.equal(uiString({}, 'fr', 'search.trigger'), UI_DEFAULTS['search.trigger'])
    assert.equal(uiString({ it: { home: 'Inizio' } }, 'en', 'home'), UI_DEFAULTS.home)
})

test('regional locales fall back to their base language, case-insensitively', () => {
    assert.equal(uiString({}, 'it-IT', 'page.copy'), ITALIAN_UI['page.copy'])
    assert.equal(uiString({}, 'IT-ch', 'page.copy'), ITALIAN_UI['page.copy'])
})

test('exact and base overrides precede bundled catalogues', () => {
    const overrides = {
        IT: { home: 'Inizio' },
        'it-IT': { home: 'Partenza' },
    }

    assert.equal(uiString(overrides, 'it-IT', 'home'), 'Partenza')
    assert.equal(uiString(overrides, 'it-CH', 'home'), 'Inizio')
    assert.equal(uiString(overrides, 'it-IT', 'page.edit'), ITALIAN_UI['page.edit'])
})

test('every bundled catalogue is complete and non-empty', () => {
    assert.ok(UI_SUPPORTED_LOCALES.includes('en'), 'English is the fallback')

    for (const [code, catalogue] of Object.entries(UI_CATALOGS)) {
        assert.deepEqual(Object.keys(catalogue), UI_KEYS, code)
        for (const key of UI_KEYS) {
            assert.ok(catalogue[key].length > 0, `${code}.${key}`)
        }
    }
})
