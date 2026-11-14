#!/usr/bin/env node
/**
 * Usage: node scripts/release.mjs <version>
 *
 * Sets every package under packages/ to <version>, commits, and creates the
 * `v<version>` tag. Pushing the tag publishes them all, in dependency order.
 */

import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const [version] = process.argv.slice(2)

const fail = (message) => {
    console.error(`release: ${message}`)
    process.exit(1)
}
const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim()

if (!version) fail('usage: node scripts/release.mjs <version>')
if (!/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(version)) fail(`${version} is not a version`)
if (git('status', '--porcelain')) fail('the working tree has uncommitted changes')

const tag = `v${version}`
if (git('tag', '--list', tag)) fail(`${tag} already exists`)

const manifests = readdirSync(join(ROOT, 'packages'))
    .map((dir) => join('packages', dir, 'package.json'))
    .filter((path) => existsSync(join(ROOT, path)))

const current = new Set(manifests.map((path) => JSON.parse(readFileSync(join(ROOT, path), 'utf8')).version))
if (current.size === 1 && current.has(version)) fail(`every package is already ${version}`)

for (const path of manifests) {
    const source = readFileSync(join(ROOT, path), 'utf8')
    const matches = source.match(/"version": "[^"]+"/g) ?? []
    if (matches.length !== 1) fail(`expected one "version" in ${path}, found ${matches.length}`)
    writeFileSync(join(ROOT, path), source.replace(/"version": "[^"]+"/, `"version": "${version}"`))
}

git('add', ...manifests)
git('commit', '-m', `chore: release ${version}`)
git('tag', '-a', tag, '-m', tag)

console.log(`${[...current].join(', ')} → ${version}, tagged ${tag}`)
console.log(`Publish with: git push origin HEAD ${tag}`)
