import { CLASS } from '../../markup.ts'

/** Fallback for markup that skipped the build-time plugin. */
export function wrapTables(root: ParentNode): void {
    root.querySelectorAll<HTMLTableElement>('table').forEach((table) => {
        if (table.parentElement?.classList.contains(CLASS.tableWrapper)) {
            return
        }
        const wrapper = document.createElement('div')
        wrapper.className = CLASS.tableWrapper
        table.replaceWith(wrapper)
        wrapper.appendChild(table)
    })
}
