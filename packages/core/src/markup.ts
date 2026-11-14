/** The markup JAAMD emits: classes, ids, icons and the default labels. The
 *  plugins, the client script and the stylesheet all agree on these. */

/** Wrapper the stylesheet and the client script select on. */
export const DEFAULT_SELECTOR = '.jaamd-content'

export const CLASS = {
    content: 'jaamd-content',
    headingLink: 'jaamd-heading-link',
    tableWrapper: 'jaamd-table-wrapper',
    toc: 'jaamd-toc',
    tocTitle: 'jaamd-toc-title',
    codeTabs: 'jaamd-code-tabs',
    codeTabButtons: 'jaamd-code-tab-buttons',
    codeTabButton: 'jaamd-code-tab-btn',
    codeTabPanel: 'jaamd-code-tab-panel',
    spoiler: 'jaamd-spoiler',
    copyButton: 'jaamd-copy-btn',
    copyIcon: 'jaamd-copy-icon',
    copiedIcon: 'jaamd-copied-icon',
    live: 'jaamd-live',
    lightbox: 'jaamd-lightbox',
    lightboxTrigger: 'jaamd-lightbox-trigger',
    lightboxImage: 'jaamd-lightbox-img',
    lightboxClose: 'jaamd-lightbox-close',
    // GitHub's names, so stylesheets written for its alerts apply.
    alert: 'markdown-alert',
    alertTitle: 'markdown-alert-title',
    alertIcon: 'octicon',
} as const

export const ID = {
    live: 'jaamd-live',
    lightbox: 'jaamd-lightbox',
    /** Prefix of a `:::code-tabs` group id. */
    codeTabs: 'jaamd-tabs-',
} as const

/** Every string JAAMD writes into a page. */
export interface Labels {
    /** Prefix of a heading anchor's name: "Link to section: Setup". */
    headingLink: string
    /** Name of a `:::toc` landmark written without a title. */
    toc: string
    copy: string
    copied: string
    /** Announced when the clipboard is unavailable and the code is selected instead. */
    copySelected: string
    /** Name of the lightbox dialog. */
    lightbox: string
    /** Name of the button around an image, followed by its alt text. */
    lightboxOpen: string
    lightboxClose: string
    spoiler: string
}

export const DEFAULT_LABELS: Labels = {
    headingLink: 'Link to section',
    toc: 'Table of contents',
    copy: 'Copy code',
    copied: 'Code copied to clipboard',
    copySelected: 'Code selected: copy it with your keyboard',
    lightbox: 'Image preview',
    lightboxOpen: 'Enlarge image',
    lightboxClose: 'Close image preview',
    spoiler: 'Spoiler',
}

export const withLabels = (labels: Partial<Labels> = {}): Labels => ({ ...DEFAULT_LABELS, ...labels })

/** "Link to section: Setup", or the label alone for an empty detail. */
export const labelled = (label: string, detail: string): string => (detail ? `${label}: ${detail}` : label)

const ICON_ATTRS = `xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true"`
const FILLED = `${ICON_ATTRS} fill="currentColor"`

export const ICON = {
    headingLink:
        `<svg ${ICON_ATTRS} fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">` +
        `<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>` +
        `<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>` +
        `</svg>`,
    copy: `<svg class="${CLASS.copyIcon}" ${FILLED}><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>`,
    copied: `<svg class="${CLASS.copiedIcon}" ${FILLED}><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`,
    close: `<svg ${FILLED}><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`,
} as const
