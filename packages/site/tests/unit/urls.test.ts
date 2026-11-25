import assert from 'node:assert/strict'
import { test } from 'node:test'
import { normaliseBasePath, withDeploymentBase } from '../../src/urls.ts'

test('base paths are normalised without a trailing slash', () => {
    assert.equal(normaliseBasePath('/'), '')
    assert.equal(normaliseBasePath('repo/'), '/repo')
    assert.equal(normaliseBasePath('/repo/docs/'), '/repo/docs')
})

test('a deployment base prefixes only root-relative urls', () => {
    assert.equal(withDeploymentBase('/', '/repo/'), '/repo/')
    assert.equal(withDeploymentBase('/guide', '/repo/'), '/repo/guide')
    assert.equal(withDeploymentBase('/repo/guide', '/repo/'), '/repo/repo/guide')
    assert.equal(withDeploymentBase('https://example.dev/a', '/repo/'), 'https://example.dev/a')
    assert.equal(withDeploymentBase('//cdn.example.dev/a', '/repo/'), '//cdn.example.dev/a')
    assert.equal(withDeploymentBase('#section', '/repo/'), '#section')
})
