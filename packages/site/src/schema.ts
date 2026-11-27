import { z } from 'astro/zod'

/** A root-relative path or an http(s) URL; `//host/...` is neither. */
export function publicUrl(field: string, example: string) {
    return z.string().refine(
        (v) => {
            return /^\/(?!\/)/.test(v) || /^https?:\/\//.test(v)
        },
        {
            message: `${field} must be a public url, such as "${example}"`,
        },
    )
}

/** A link's target: a path, or a URL in a scheme a browser opens as a page or
 *  an address. `javascript:` and `data:` are refused. */
export function linkHref(field: string) {
    return z.string().refine(
        (v) => {
            return !/^[a-z][a-z\d+.-]*:/i.test(v) || /^(https?|mailto|tel):/i.test(v)
        },
        {
            message: `${field} must be a path or an http(s), mailto or tel URL`,
        },
    )
}
