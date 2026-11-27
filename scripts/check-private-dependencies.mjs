#!/usr/bin/env node
/**
 * Usage: node scripts/check-private-dependencies.mjs
 *
 * Fails when a public package under packages/ depends on a private one: the
 * release would publish it naming a package npm does not have.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const PACKAGES = fileURLToPath(new URL('../packages', import.meta.url))

const manifests = readdirSync(PACKAGES)
    .map((dir) => {
        return join(PACKAGES, dir, 'package.json')
    })
    .filter(existsSync)
    .map((file) => {
        return JSON.parse(readFileSync(file, 'utf8'))
    })

const privateNames = new Set(
    manifests
        .filter((manifest) => {
            return manifest.private === true
        })
        .map((manifest) => {
            return manifest.name
        }),
)

const problems = manifests
    .filter((manifest) => {
        return manifest.private !== true
    })
    .flatMap((manifest) => {
        const dependencies = Object.keys({ ...manifest.dependencies, ...manifest.peerDependencies })
        return dependencies
            .filter((name) => {
                return privateNames.has(name)
            })
            .map((name) => {
                return `${manifest.name} is public but depends on ${name}, which is private`
            })
    })

if (problems.length > 0) {
    console.error(problems.join('\n'))
    process.exit(1)
}
