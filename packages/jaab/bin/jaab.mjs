#!/usr/bin/env node
import { newPost, parseArgs, writePost } from './new-post.mjs'

const parsed = parseArgs(process.argv.slice(2))
if (parsed.error) {
    console.error(parsed.error)
    process.exit(1)
}

try {
    console.log(writePost(newPost(parsed, process.cwd(), new Date()), process.cwd()))
} catch (error) {
    console.error(`jaab: ${error.message}`)
    process.exit(1)
}
