import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { normaliseRemote, editBaseFrom, inferRepo, inferDescription } from '../../src/infer.ts'

test('ssh and https remotes normalise to the same browsable url', () => {
    const expected = 'https://github.com/owner/repo'
    for (const remote of [
        'git@github.com:owner/repo.git',
        'git@github.com:owner/repo',
        'https://github.com/owner/repo.git',
        'https://github.com/owner/repo',
        'https://token@github.com/owner/repo.git',
    ]) {
        assert.equal(normaliseRemote(remote), expected, remote)
    }
})

test('non-github hosts and nested groups survive', () => {
    assert.equal(normaliseRemote('git@gitlab.com:group/sub/repo.git'), 'https://gitlab.com/group/sub/repo')
})

test('an unparseable remote yields null rather than a wrong link', () => {
    assert.equal(normaliseRemote('file:///srv/repo.git'), null)
    assert.equal(normaliseRemote(''), null)
})

test('the edit base points at the docs directory from the repository root', () => {
    const repo = { url: 'https://github.com/o/r', branch: 'main', prefix: '' }
    assert.equal(editBaseFrom(repo, './docs'), 'https://github.com/o/r/edit/main/docs/')
})

test('each forge gets the editor url it serves', () => {
    const base = (url: string) => editBaseFrom({ url, branch: 'main', prefix: '' }, 'docs')
    assert.equal(base('https://gitlab.com/g/r'), 'https://gitlab.com/g/r/-/edit/main/docs/')
    assert.equal(base('https://codeberg.org/o/r'), 'https://codeberg.org/o/r/_edit/main/docs/')
    assert.equal(base('https://gitea.com/o/r'), 'https://gitea.com/o/r/_edit/main/docs/')
    assert.equal(base('https://bitbucket.org/o/r'), 'https://bitbucket.org/o/r/src/main/docs/:path?mode=edit')
    assert.equal(base('https://gitlab.example.dev/g/r'), 'https://gitlab.example.dev/g/r/-/edit/main/docs/')
})

test('no edit base where the editor url is unknown or there is none', () => {
    const base = (url: string) => editBaseFrom({ url, branch: 'main', prefix: '' }, 'docs')
    assert.equal(base('https://git.sr.ht/~o/r'), null)
    assert.equal(base('https://git.example.dev/o/r'), null)
})

test('no edit base without a branch, as on a detached checkout', () => {
    assert.equal(editBaseFrom({ url: 'https://github.com/o/r', branch: null, prefix: '' }, 'docs'), null)
})

test('a detached checkout takes the branch CI names, never "HEAD"', () => {
    const dir = mkdtempSync(join(tmpdir(), 'jaad-detached-'))
    const git = (...args: string[]) => execFileSync('git', args, { cwd: dir, stdio: 'ignore' })
    try {
        git('init', '-q', '-b', 'main')
        git('remote', 'add', 'origin', 'git@github.com:o/r.git')
        git(
            '-c',
            'user.name=t',
            '-c',
            'user.email=t@t',
            '-c',
            'commit.gpgsign=false',
            'commit',
            '-q',
            '--allow-empty',
            '-m',
            'x',
        )
        assert.equal(inferRepo(dir, {})?.branch, 'main')

        git('checkout', '-q', '--detach')
        assert.equal(inferRepo(dir, {})?.branch, null)
        assert.equal(inferRepo(dir, { GITHUB_REF_TYPE: 'branch', GITHUB_REF_NAME: 'docs' })?.branch, 'docs')
        assert.equal(inferRepo(dir, { GITHUB_REF_TYPE: 'tag', GITHUB_REF_NAME: 'v1.0.0' })?.branch, null)
        assert.equal(inferRepo(dir, { CF_PAGES_BRANCH: 'preview' })?.branch, 'preview')
    } finally {
        rmSync(dir, { recursive: true, force: true })
    }
})

test('a site in a subdirectory keeps the subdirectory in the edit link', () => {
    const repo = { url: 'https://github.com/o/r', branch: 'dev', prefix: 'www/' }
    assert.equal(editBaseFrom(repo, './docs'), 'https://github.com/o/r/edit/dev/www/docs/')
})

test('inference degrades to null instead of throwing outside a repository', () => {
    assert.equal(inferRepo('/'), null)
    assert.equal(inferDescription('/'), null)
})
