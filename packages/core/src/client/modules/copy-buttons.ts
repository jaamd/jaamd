import type { Labels } from '../../markup.ts'
import { CLASS, ICON, ID } from '../../markup.ts'
import { qs, qsa } from '../dom.ts'

const RESET_MS = 2000

const resetTimers = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>()
/** What each button announces, in the language it was added with. */
const messages = new WeakMap<Element, Pick<Labels, 'copied' | 'copySelected'>>()

export function addCopyButtons(root: ParentNode, labels: Labels): void {
    qsa<HTMLElement>(root, 'pre').forEach((pre) => {
        if (qs(pre, `.${CLASS.copyButton}`)) return
        if (!qs(pre, 'code')) return

        const btn = document.createElement('button')
        btn.type = 'button'
        btn.className = CLASS.copyButton
        btn.title = labels.copy
        btn.setAttribute('aria-label', labels.copy)
        // Both icons: `data-copied` picks one in CSS.
        btn.innerHTML = ICON.copy + ICON.copied
        messages.set(btn, labels)

        pre.appendChild(btn)
    })
}

/** The only clipboard write in the package. */
export async function onCopyClick(target: Element): Promise<void> {
    const btn = target.closest<HTMLElement>(`.${CLASS.copyButton}`)
    const code = btn?.parentElement && qs<HTMLElement>(btn.parentElement, 'code')
    const labels = btn && messages.get(btn)
    if (!btn || !code || !labels) return

    let copied = true
    try {
        await navigator.clipboard.writeText(code.textContent ?? '')
    } catch {
        // No clipboard (non-secure context, denied, blocked): select the code.
        copied = false
        const range = document.createRange()
        range.selectNodeContents(code)
        const selection = getSelection()
        selection?.removeAllRanges()
        selection?.addRange(range)
    }

    btn.dataset.copied = copied ? 'true' : 'manual'
    announce(copied ? labels.copied : labels.copySelected)

    // Restart on every click.
    clearTimeout(resetTimers.get(btn))
    resetTimers.set(
        btn,
        setTimeout(() => delete btn.dataset.copied, RESET_MS),
    )
}

/** One polite live region. Looked up each time: View Transitions swap <body>. */
function announce(message: string): void {
    let live = document.getElementById(ID.live)
    if (!live) {
        live = document.createElement('div')
        live.id = ID.live
        live.className = CLASS.live
        live.setAttribute('role', 'status')
        live.setAttribute('aria-live', 'polite')
        document.body.appendChild(live)
    }
    // Cleared first, so the same message is announced again.
    live.textContent = ''
    requestAnimationFrame(() => (live.textContent = message))
}
