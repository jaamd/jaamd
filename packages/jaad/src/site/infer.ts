import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join, posix } from 'node:path'
import { forgeForUrl } from './forges.ts'

const git = (args: string[], cwd: string): string | null => {
    try {
        return execFileSync('git', args, {
            cwd,
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore'],
        }).trim()
    } catch {
        return null
    }
}

/** `git@host:owner/repo.git` and `https://host/owner/repo.git` both become
 *  `https://host/owner/repo`. */
export function normaliseRemote(remote: string): string | null {
    const ssh = remote.match(/^[\w.-]+@([\w.-]+):(.+?)(?:\.git)?$/)
    if (ssh) return `https://${ssh[1]}/${ssh[2]}`

    const https = remote.match(/^https?:\/\/(?:[^@/]+@)?([\w.-]+)\/(.+?)(?:\.git)?$/)
    if (https) return `https://${https[1]}/${https[2]}`

    return null
}

export interface RepoInfo {
    /** Browsable base, e.g. https://github.com/owner/repo */
    url: string
    /** Null on a detached checkout outside a CI that names the branch. */
    branch: string | null
    /** Path from the repository root to the Astro project, "" at the root. */
    prefix: string
}

/** The branch CI services build, for checkouts that leave HEAD detached. */
function ciBranch(env: NodeJS.ProcessEnv): string | null {
    const githubBranch = env.GITHUB_REF_TYPE === 'branch' ? env.GITHUB_REF_NAME : undefined
    const candidates = [
        env.GITHUB_HEAD_REF, // GitHub Actions, pull requests
        githubBranch,
        env.CI_COMMIT_BRANCH, // GitLab CI
        env.CF_PAGES_BRANCH, // Cloudflare Pages
        env.VERCEL_GIT_COMMIT_REF, // Vercel
        env.BRANCH, // Netlify
    ]
    return candidates.find((branch) => branch) ?? null
}

/** Returns null outside a repository, in a tarball, or without an origin. */
export function inferRepo(cwd: string = process.cwd(), env: NodeJS.ProcessEnv = process.env): RepoInfo | null {
    const remote = git(['remote', 'get-url', 'origin'], cwd)
    if (!remote) return null

    const url = normaliseRemote(remote)
    if (!url) return null

    // `rev-parse --abbrev-ref` would answer "HEAD" on a detached checkout.
    const branch = git(['symbolic-ref', '--short', '-q', 'HEAD'], cwd) || ciBranch(env)

    return {
        url,
        branch,
        prefix: git(['rev-parse', '--show-prefix'], cwd) ?? '',
    }
}

type EditPattern = (url: string, branch: string, path: string) => string

/** How each forge spells the editor of a file; `path` is the directory, with no slashes around it. */
const EDIT_PATTERNS: Record<string, EditPattern> = {
    github: (url, branch, path) => `${url}/edit/${branch}/${path}/`,
    gitlab: (url, branch, path) => `${url}/-/edit/${branch}/${path}/`,
    gitea: (url, branch, path) => `${url}/_edit/${branch}/${path}/`,
    bitbucket: (url, branch, path) => `${url}/src/${branch}/${path}/:path?mode=edit`,
}

/** Forges that share another's editor urls. SourceHut has no web editor. */
const EDIT_PATTERN_OF: Record<string, string> = {
    github: 'github',
    gitlab: 'gitlab',
    gitea: 'gitea',
    codeberg: 'gitea',
    forgejo: 'gitea',
    bitbucket: 'bitbucket',
}

/** The forge whose editor urls a repository uses: its known host, or a
 *  self-hosted one named after it, as gitlab.example.dev. */
function editForge(url: string): string | null {
    const known = forgeForUrl(url)
    if (known) {
        return EDIT_PATTERN_OF[known] ?? null
    }

    const host = url.match(/^https?:\/\/([^/]+)/)?.[1] ?? ''
    const named = Object.keys(EDIT_PATTERN_OF).find((forge) => host.startsWith(`${forge}.`))
    return named ? EDIT_PATTERN_OF[named] : null
}

/** Ends in a slash, or holds `:path`. `docsDir` resolves against the repository
 *  root, not the Astro project, so a site in a subdirectory still links
 *  correctly. Null when the forge or the branch is unknown. */
export function editBaseFrom(repo: RepoInfo, docsDir: string): string | null {
    const forge = editForge(repo.url)
    if (!forge || !repo.branch) {
        return null
    }

    // Normalised: a section can sit outside the project, as `../packages/x/docs`.
    const path = posix.normalize(`${repo.prefix}${docsDir}`).replace(/^\/+|\/+$/g, '')
    return EDIT_PATTERNS[forge](repo.url, repo.branch, path)
}

/** `:path` is substituted when present, otherwise the file is appended. */
export function editUrl(base: string, filePath: string): string {
    return base.includes(':path') ? base.replace(':path', filePath) : base.replace(/\/?$/, '/') + filePath
}

export function inferDescription(cwd: string = process.cwd()): string | null {
    try {
        const pkg = JSON.parse(readFileSync(join(cwd, 'package.json'), 'utf8')) as {
            description?: unknown
        }

        return typeof pkg.description === 'string' && pkg.description ? pkg.description : null
    } catch {
        return null
    }
}
