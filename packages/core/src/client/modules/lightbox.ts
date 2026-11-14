import type { Labels } from '../../markup.ts'
import { CLASS, ICON, ID, labelled } from '../../markup.ts'
import { qsa } from '../dom.ts'

/**
 * Modal `<dialog>` driven by invoker commands: the triggers open it, the close
 * button and a click outside (`closedby="any"`) close it. Escape, focus trap and
 * focus return are the browser's.
 */
function lightbox(labels: Labels): HTMLDialogElement {
    // Looked up each time: View Transitions swap <body>.
    const existing = document.getElementById(ID.lightbox)
    if (existing instanceof HTMLDialogElement) return existing

    const dialog = document.createElement('dialog')
    dialog.id = ID.lightbox
    dialog.className = CLASS.lightbox
    dialog.setAttribute('closedby', 'any')
    dialog.setAttribute('aria-label', labels.lightbox)

    const close = document.createElement('button')
    close.type = 'button'
    close.className = CLASS.lightboxClose
    close.setAttribute('commandfor', ID.lightbox)
    close.setAttribute('command', 'close')
    close.setAttribute('aria-label', labels.lightboxClose)
    close.innerHTML = ICON.close

    const preview = document.createElement('img')
    preview.className = CLASS.lightboxImage
    preview.alt = ''
    dialog.append(close, preview)

    // Fires before the dialog opens: show the image of the trigger that invoked it.
    dialog.addEventListener('command', (e) => {
        const { command, source } = e as CommandEvent
        const img = source?.querySelector('img')
        if (command !== 'show-modal' || !img) return

        preview.src = img.currentSrc || img.src
        preview.alt = img.alt
    })

    document.body.appendChild(dialog)
    return dialog
}

/** Wraps each image in a button that opens the lightbox. Opt out with
 *  `data-no-lightbox`. Linked images are skipped: a click on
 *  `[![alt](src)](href)` must follow the link. */
export function addImageLightbox(root: ParentNode, labels: Labels): void {
    const images = [...qsa<HTMLImageElement>(root, 'img')].filter(
        (img) => !img.hasAttribute('data-no-lightbox') && !img.closest(`a, .${CLASS.lightboxTrigger}`),
    )
    if (images.length === 0) return

    lightbox(labels)

    for (const img of images) {
        const trigger = document.createElement('button')
        trigger.type = 'button'
        trigger.className = CLASS.lightboxTrigger
        trigger.setAttribute('commandfor', ID.lightbox)
        trigger.setAttribute('command', 'show-modal')
        trigger.setAttribute('aria-label', labelled(labels.lightboxOpen, img.alt))
        if (!img.title) img.title = img.alt || labels.lightboxOpen

        img.replaceWith(trigger)
        trigger.appendChild(img)
    }
}
