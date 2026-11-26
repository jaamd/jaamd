import { readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { readFrontmatter } from '@jaamd/site/frontmatter.ts'
import { postSlug, type PostFile } from './posts.ts'

/** Every post below `dir`, read from disk: the content collection is not
 *  available while the integration sets up. `root` makes the paths relative. */
export function readPostFiles(dir: string, root: string): PostFile[] {
    const files: PostFile[] = []

    const visit = (current: string) => {
        const entries = readdirSync(current, { withFileTypes: true }).toSorted((a, b) => {
            return a.name.localeCompare(b.name)
        })
        for (const entry of entries) {
            const file = join(current, entry.name)
            if (entry.isDirectory()) {
                visit(file)
                continue
            }
            if (!entry.isFile() || !entry.name.endsWith('.md')) {
                continue
            }

            const slug = postSlug(relative(dir, file).split('\\').join('/'))
            if (slug === null) {
                continue
            }
            files.push({ file: relative(root, file), slug, data: readFrontmatter(readFileSync(file, 'utf8')) })
        }
    }
    visit(dir)

    return files
}
