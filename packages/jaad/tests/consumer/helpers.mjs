import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const temporaryDirectories = new Set()

export function temporaryDirectory(prefix) {
    const dir = mkdtempSync(join(tmpdir(), prefix))
    temporaryDirectories.add(dir)
    return dir
}

export function cleanupTemporaryDirectories() {
    for (const dir of temporaryDirectories) rmSync(dir, { recursive: true })
    temporaryDirectories.clear()
}

export function run(command, args, cwd) {
    try {
        return execFileSync(command, args, {
            cwd,
            encoding: 'utf8',
            stdio: 'pipe',
        })
    } catch (error) {
        const stdout = error?.stdout?.toString().trim()
        const stderr = error?.stderr?.toString().trim()
        const details = [stdout, stderr].filter(Boolean).join('\n')
        throw new Error(`${command} ${args.join(' ')} failed${details ? `\n${details}` : ''}`, { cause: error })
    }
}

/** Packs into an isolated directory, with pnpm so `workspace:` ranges become versions. */
export function packPackage(packageDir) {
    const destination = temporaryDirectory('jaad-pack-')
    const output = run('pnpm', ['pack', '--pack-destination', destination, '--json'], packageDir)
    return JSON.parse(output).filename
}

const JAAMD = fileURLToPath(new URL('../../../astro', import.meta.url))
const CORE = fileURLToPath(new URL('../../../core', import.meta.url))
let packed

/** `@jaamd/astro` and `@jaamd/core` from this workspace instead of the registry. */
export function jaamdOverride() {
    packed ??= {
        '@jaamd/astro': `file:${packPackage(JAAMD)}`,
        '@jaamd/core': `file:${packPackage(CORE)}`,
    }
    return packed
}
