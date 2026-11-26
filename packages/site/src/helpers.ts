export function ucfirst(str: string): string {
    if (str.length === 0) {
        return str
    }
    return str.charAt(0).toUpperCase() + str.slice(1)
}

/** JSON for a `<script>` element. Escaping `<` keeps a `</script>` inside a
 *  string from closing the element; JSON reads `\u003c` back as `<`. */
export function scriptJson(data: unknown): string {
    return JSON.stringify(data).replaceAll('<', '\\u003c')
}

const HTML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }

/** Text safe inside HTML, attribute values included. */
export function escapeHtml(text: string): string {
    return text.replace(/[&<>"']/g, (character) => {
        return HTML_ESCAPES[character] ?? character
    })
}

/** `template` with each `{name}` replaced by its value, as the UI strings write them. */
export function fill(template: string, values: Record<string, string | number>): string {
    return template.replace(/\{(\w+)\}/g, (placeholder, name: string) => {
        return name in values ? String(values[name]) : placeholder
    })
}
