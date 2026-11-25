import { CLASS } from '../../markup.ts'

const GROUP = `.${CLASS.codeTabs}[data-tabs-init]`
const BUTTON = `.${CLASS.codeTabButton}`
const PANEL = `.${CLASS.codeTabPanel}`

const buttonsOf = (group: Element): HTMLButtonElement[] => {
    return Array.from(group.querySelectorAll<HTMLButtonElement>(BUTTON))
}

/** `aria-selected`, the roving `tabindex` and the panel's `data-active` always
 *  change together (WAI-ARIA tabs pattern). */
function select(group: Element, index: number, moveFocus: boolean): void {
    const buttons = buttonsOf(group)

    buttons.forEach((btn, i) => {
        const selected = i === index
        btn.setAttribute('aria-selected', String(selected))
        btn.tabIndex = selected ? 0 : -1
    })

    group.querySelectorAll<HTMLElement>(PANEL).forEach((panel) => {
        panel.toggleAttribute('data-active', panel.dataset.tabIndex === String(index))
    })

    if (moveFocus) {
        buttons[index]?.focus()
    }
}

/** Marks the tablists emitted by the `:::code-tabs` plugin as live. */
export function initCodeTabs(root: ParentNode): void {
    root.querySelectorAll<HTMLElement>(`.${CLASS.codeTabs}`).forEach((group) => {
        if (group.dataset.tabsInit) {
            return
        }
        group.dataset.tabsInit = '1'

        const buttons = buttonsOf(group)
        if (buttons.length === 0) {
            return
        }

        // Re-assert so the three attributes start out in agreement.
        const initial = buttons.findIndex((b) => {
            return b.getAttribute('aria-selected') === 'true'
        })
        select(group, initial === -1 ? 0 : initial, false)
    })
}

function locate(target: Element): { group: Element; index: number; last: number } | null {
    const btn = target.closest<HTMLButtonElement>(BUTTON)
    const group = btn?.closest(GROUP)
    if (!btn || !group) {
        return null
    }

    const buttons = buttonsOf(group)
    return { group, index: buttons.indexOf(btn), last: buttons.length - 1 }
}

export function onTabClick(target: Element): void {
    const tab = locate(target)
    if (tab) {
        select(tab.group, tab.index, false)
    }
}

/** Arrow/Home/End move between tabs. */
export function onTabKeydown(target: Element, e: KeyboardEvent): void {
    const tab = locate(target)
    if (!tab) {
        return
    }

    const { index, last } = tab
    let next: number | null = null

    if (e.key === 'ArrowRight') {
        next = index === last ? 0 : index + 1
    } else if (e.key === 'ArrowLeft') {
        next = index === 0 ? last : index - 1
    } else if (e.key === 'Home') {
        next = 0
    } else if (e.key === 'End') {
        next = last
    }

    if (next === null) {
        return
    }
    // Stop the host page treating these as page-level shortcuts.
    e.preventDefault()
    e.stopPropagation()
    select(tab.group, next, true)
}
