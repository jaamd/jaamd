import type { z } from 'astro/zod'

export interface ParseOptions {
    /** The prefix of the messages, such as `jaad`. */
    product: string
    /** Keys passed on to Astro rather than checked by the schema. */
    forwarded: string[]
}

/** A package's options, checked against its schema. Unknown keys are rejected
 *  here: zod would strip a misspelt option in silence. Both messages are read
 *  in a terminal, not parsed. */
export function parseOptions<Schema extends z.ZodObject>(
    schema: Schema,
    options: object,
    { product, forwarded }: ParseOptions,
): z.output<Schema> {
    const available = Object.keys(schema.shape)
    const known = new Set([...available, ...forwarded])
    const unknown = Object.keys(options).filter((key) => {
        return !known.has(key)
    })

    if (unknown.length > 0) {
        const named = unknown.map((key) => {
            const close = available.find((option) => {
                return option.toLowerCase() === key.toLowerCase()
            })
            return close ? `${key} (did you mean ${close}?)` : key
        })
        throw new Error(
            `${product}: unknown option${unknown.length > 1 ? 's' : ''} ${named.join(', ')}\n` +
                `  available: ${available.join(', ')}`,
        )
    }

    const parsed = schema.safeParse(options)
    if (parsed.success) {
        return parsed.data
    }

    throw new Error(
        `${product}: invalid configuration\n` +
            parsed.error.issues
                .map((issue) => {
                    return `  ${issue.path.join('.') || 'config'}: ${issue.message}`
                })
                .join('\n'),
    )
}
