import { CLASS } from '../../markup.ts'
import { qsa } from '../dom.ts'

/** Fallback for markup that skipped the build-time plugin. */
export function wrapTables(root: ParentNode): void {
    qsa<HTMLTableElement>(root, 'table').forEach((table) => {
        if (table.parentElement?.classList.contains(CLASS.tableWrapper)) return
        const wrapper = document.createElement('div')
        wrapper.className = CLASS.tableWrapper
        table.replaceWith(wrapper)
        wrapper.appendChild(table)
    })
}
