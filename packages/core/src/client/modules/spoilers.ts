import type { Labels } from '../../markup.ts'
import { CLASS } from '../../markup.ts'
import { qsa } from '../dom.ts'

const INITIALIZED = `.${CLASS.spoiler}[data-spoiler-init]`

/** Gives a hidden spoiler button semantics, so it is reachable without a mouse. */
export function initSpoilers(root: ParentNode, labels: Labels): void {
    qsa<HTMLElement>(root, `.${CLASS.spoiler}`).forEach((el) => {
        if (el.dataset.spoilerInit) return
        el.dataset.spoilerInit = '1'
        if (el.hasAttribute('data-revealed')) return

        if (!el.hasAttribute('tabindex')) el.tabIndex = 0
        if (!el.hasAttribute('role')) el.setAttribute('role', 'button')
        el.setAttribute('aria-expanded', 'false')
        if (!el.hasAttribute('aria-label')) el.setAttribute('aria-label', labels.spoiler)
    })
}

/**
 * Reveals for good, until the page reloads. The button semantics go: as a
 * button the content would be read as its label, and its links would sit
 * inside another control. Focus stays on it, out of the tab order.
 */
function reveal(el: Element): void {
    if (el.hasAttribute('data-revealed')) return

    el.setAttribute('data-revealed', '')
    el.removeAttribute('role')
    el.removeAttribute('aria-label')
    el.removeAttribute('aria-expanded')
    el.setAttribute('tabindex', '-1')
}

export function onSpoilerClick(target: Element): void {
    const el = target.closest(INITIALIZED)
    if (el) reveal(el)
}

export function onSpoilerKeydown(target: Element, e: KeyboardEvent): void {
    if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return
    // The hidden spoiler itself, not a focusable child or a revealed one.
    if (!target.matches(INITIALIZED) || target.hasAttribute('data-revealed')) return
    e.preventDefault() // Space would scroll the page
    reveal(target)
}
