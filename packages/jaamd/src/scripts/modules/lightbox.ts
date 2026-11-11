import { qs, qsa } from '@jaamd/core/client/utils'

const DIALOG_ID = 'jaamd-lightbox'
const TRIGGER = 'jaamd-lightbox-trigger'

const CLOSE_ICON =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em" aria-hidden="true">` +
    `<path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`

/**
 * Modal `<dialog>` driven by invoker commands: the triggers open it, the close
 * button and a click outside (`closedby="any"`) close it. Escape, focus trap and
 * focus return are the browser's.
 */
function lightbox(): HTMLDialogElement {
    // Looked up each time: View Transitions swap <body>.
    const existing = document.getElementById(DIALOG_ID)
    if (existing instanceof HTMLDialogElement) return existing

    const dialog = document.createElement('dialog')
    dialog.id = DIALOG_ID
    dialog.className = 'jaamd-lightbox'
    dialog.setAttribute('closedby', 'any')
    dialog.setAttribute('aria-label', 'Image preview')
    dialog.innerHTML =
        `<button type="button" class="jaamd-lightbox__close" commandfor="${DIALOG_ID}" command="close" aria-label="Close image preview">${CLOSE_ICON}</button>` +
        `<img class="jaamd-lightbox__img" src="" alt="" />`

    // Fires before the dialog opens: show the image of the trigger that invoked it.
    dialog.addEventListener('command', (e) => {
        const { command, source } = e as CommandEvent
        const img = source?.querySelector('img')
        if (command !== 'show-modal' || !img) return

        const preview = qs<HTMLImageElement>(dialog, '.jaamd-lightbox__img')!
        preview.src = img.currentSrc || img.src
        preview.alt = img.alt
    })

    document.body.appendChild(dialog)
    return dialog
}

/** Wraps each image in a button that opens the lightbox. Opt out with
 *  `data-no-lightbox`. Linked images are skipped: a click on
 *  `[![alt](src)](href)` must follow the link. */
export function addImageLightbox(selector: string): void {
    const images = [...qsa<HTMLImageElement>(document, `${selector} img`)].filter(
        (img) => !img.hasAttribute('data-no-lightbox') && !img.closest(`a, .${TRIGGER}`),
    )
    if (images.length === 0) return

    lightbox()

    for (const img of images) {
        const trigger = document.createElement('button')
        trigger.type = 'button'
        trigger.className = TRIGGER
        trigger.setAttribute('commandfor', DIALOG_ID)
        trigger.setAttribute('command', 'show-modal')
        trigger.setAttribute('aria-label', img.alt ? `Enlarge image: ${img.alt}` : 'Enlarge image')
        if (!img.title) img.title = img.alt || 'Click to enlarge'

        img.replaceWith(trigger)
        trigger.appendChild(img)
    }
}
