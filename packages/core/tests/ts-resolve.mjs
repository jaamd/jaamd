/** Resolves the `.js` specifiers of the sources to their `.ts` files. */

import { registerHooks } from 'node:module'

registerHooks({
    resolve(specifier, context, nextResolve) {
        try {
            return nextResolve(specifier, context)
        } catch (error) {
            if (!specifier.startsWith('.') || !specifier.endsWith('.js')) throw error
            return nextResolve(`${specifier.slice(0, -3)}.ts`, context)
        }
    },
})
