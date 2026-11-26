import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { slug } from 'github-slugger'

export const USAGE = `Usage: jaab new "Title of the post" [--dir] [--blog-dir <dir>]

  --dir             a directory with index.md, for images beside the post
  --blog-dir <dir>  where the posts are, ./blog unless the config says otherwise`

/** The arguments of `jaab`, or the message to print instead. */
export function parseArgs(args) {
    const [command, ...rest] = args
    if (command !== 'new') {
        return { error: USAGE }
    }

    let title = null
    let dir = false
    let blogDir = 'blog'
    for (let at = 0; at < rest.length; at++) {
        const arg = rest[at]
        if (arg === '--dir') {
            dir = true
        } else if (arg === '--blog-dir') {
            blogDir = rest[++at]
            if (!blogDir) {
                return { error: '--blog-dir needs a directory' }
            }
        } else if (arg.startsWith('--')) {
            return { error: `unknown option ${arg}\n\n${USAGE}` }
        } else if (title === null) {
            title = arg
        } else {
            return { error: `one title only: quote it, as jaab new "${title} ${arg}"` }
        }
    }

    if (!title || !slug(title)) {
        return { error: USAGE }
    }
    return { title, dir, blogDir }
}

const pad = (value) => {
    return String(value).padStart(2, '0')
}

/** The day of `date` where its author is, as `2026-11-22`: in UTC, a post
 *  begun just after midnight in Rome would be dated the day before. */
export function localDay(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** The new post's file and its text, dated `today`. */
export function newPost({ title, dir, blogDir }, cwd, today) {
    const name = slug(title)
    const file = join(cwd, blogDir, dir ? join(name, 'index.md') : `${name}.md`)
    const day = localDay(today)
    // JSON is YAML too: the title keeps its quotes and colons.
    const source = `---\ntitle: ${JSON.stringify(title)}\ndate: ${day}\n---\n\n`
    return { file, source }
}

/** Writes the post, unless a file is already there. Returns the message to print. */
export function writePost(post, cwd) {
    const shown = relative(cwd, post.file)
    if (existsSync(post.file)) {
        throw new Error(`${shown} already exists. Pick another title, or edit that file.`)
    }
    mkdirSync(dirname(post.file), { recursive: true })
    writeFileSync(post.file, post.source)
    return `Wrote ${shown}`
}
