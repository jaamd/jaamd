import type { Labels } from '../../markup.ts'
import { CLASS, ICON, labelled } from '../../markup.ts'
import { qs, qsa, slugify, uniqueElementId } from '../dom.ts'

/** Fallback for markup that skipped the build-time plugin. */
export function addHeadingLinks(root: ParentNode, labels: Labels): void {
    // All six levels: a TOC can link an h5.
    qsa<HTMLElement>(root, 'h1, h2, h3, h4, h5, h6').forEach((header) => {
        if (!header.id) header.id = uniqueElementId(slugify(header.textContent ?? ''))
        if (qs(header, `.${CLASS.headingLink}`)) return

        const a = document.createElement('a')
        a.className = CLASS.headingLink
        a.setAttribute('aria-label', labelled(labels.headingLink, header.textContent ?? ''))
        a.setAttribute('href', `#${header.id}`)
        a.innerHTML = ICON.headingLink

        header.appendChild(a)
    })
}
