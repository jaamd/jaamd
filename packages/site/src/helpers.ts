export function ucfirst(str: string): string {
    if (str.length === 0) return str
    return str.charAt(0).toUpperCase() + str.slice(1)
}

/** JSON for a `<script>` element. Escaping `<` keeps a `</script>` inside a
 *  string from closing the element; JSON reads `\u003c` back as `<`. */
export function scriptJson(data: unknown): string {
    return JSON.stringify(data).replaceAll('<', '\\u003c')
}
