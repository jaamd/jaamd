import assert from 'node:assert/strict'
import { test } from 'node:test'
import { scriptJson } from '../../src/site/helpers.ts'

test('JSON for a script element cannot close it, and reads back unchanged', () => {
    const data = { headline: 'Avoid </script><img src=x onerror=alert(1)> in titles' }
    const json = scriptJson(data)

    assert.doesNotMatch(json, /<\/script/i)
    assert.doesNotMatch(json, /</)
    assert.deepEqual(JSON.parse(json), data)
})
