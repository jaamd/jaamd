#!/usr/bin/env node
/**
 * Usage: node scripts/release.mjs <package> <version>
 *
 * Sets packages/<package> to <version>, updates the version create-jaad installs
 * when <package> is jaad, commits, and creates the `<package>@<version>` tag.
 * Pushing the tag publishes the package.
 */

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const [pkg, version] = process.argv.slice(2)

const fail = (message) => {
    console.error(`release: ${message}`)
    process.exit(1)
}
const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim()

if (!pkg || !version) fail('usage: node scripts/release.mjs <package> <version>')
if (!/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(version)) fail(`${version} is not a version`)

const manifestPath = join('packages', pkg, 'package.json')
if (!existsSync(join(ROOT, manifestPath))) fail(`no package at packages/${pkg}`)
if (git('status', '--porcelain')) fail('the working tree has uncommitted changes')

const tag = `${pkg}@${version}`
if (git('tag', '--list', tag)) fail(`${tag} already exists`)

/** Replaces exactly one match of `pattern` in `file`. */
function replaceOnce(file, pattern, replacement) {
    const source = readFileSync(join(ROOT, file), 'utf8')
    const matches = source.match(new RegExp(pattern.source, `${pattern.flags}g`)) ?? []
    if (matches.length !== 1) fail(`expected one ${pattern} in ${file}, found ${matches.length}`)
    writeFileSync(join(ROOT, file), source.replace(pattern, replacement))
}

const current = JSON.parse(readFileSync(join(ROOT, manifestPath), 'utf8')).version
if (current === version) fail(`${pkg} is already ${version}`)
replaceOnce(manifestPath, /"version": "[^"]+"/, `"version": "${version}"`)
const changed = [manifestPath]

if (pkg === 'jaad') {
    const scaffolder = join('packages', 'create-jaad', 'index.mjs')
    replaceOnce(scaffolder, /const JAAD = '\^[^']+'/, `const JAAD = '^${version}'`)
    changed.push(scaffolder)
}

git('add', ...changed)
git('commit', '-m', `chore: bump ${pkg} to ${version}`)
git('tag', '-a', tag, '-m', tag)

console.log(`${pkg} ${current} → ${version}, tagged ${tag}`)
if (pkg === 'jaad') console.log('create-jaad now installs this version: release create-jaad as well.')
console.log(`Publish with: git push origin HEAD ${tag}`)
