import type { Features } from '../features.ts'
import type { Labels } from '../markup.ts'
import { resolveFeatures } from '../features.ts'
import { DEFAULT_SELECTOR, withLabels } from '../markup.ts'
import { initCodeTabs, onTabClick, onTabKeydown } from './modules/code-tabs.ts'
import { addCopyButtons, onCopyClick } from './modules/copy-buttons.ts'
import { addHeadingLinks } from './modules/heading-links.ts'
import { addImageLightbox } from './modules/lightbox.ts'
import { initSpoilers, onSpoilerClick, onSpoilerKeydown } from './modules/spoilers.ts'
import { wrapTables } from './modules/tables.ts'
import { initToc } from './modules/toc.ts'

export interface EnhanceOptions {
    features?: Features
    labels?: Partial<Labels>
}

function onClick(e: MouseEvent): void {
    if (!(e.target instanceof Element)) return
    void onCopyClick(e.target)
    onTabClick(e.target)
    onSpoilerClick(e.target)
}

function onKeydown(e: KeyboardEvent): void {
    if (!(e.target instanceof Element)) return
    onTabKeydown(e.target, e)
    onSpoilerKeydown(e.target, e)
}

/** The calls not cleaned up yet. The two listeners on `document` live while
 *  there is one. */
const live = new Set<symbol>()

/**
 * Enhances the markdown inside `root`: an element, or a selector for every
 * wrapper on the page. Safe to call again on the same markup.
 *
 * Returns the cleanup: it releases the listeners and observers the call holds.
 * The elements it added leave with the markup they sit in.
 */
export function enhance(root: ParentNode | string = DEFAULT_SELECTOR, options: EnhanceOptions = {}): () => void {
    const on = resolveFeatures(options.features)
    const labels = withLabels(options.labels)
    const roots = typeof root === 'string' ? [...document.querySelectorAll(root)] : [root]
    const disposers: (() => void)[] = []

    for (const el of roots) {
        if (on.headingLinks) addHeadingLinks(el, labels)
        // After addHeadingLinks: the ids must exist.
        if (on.toc) disposers.push(initToc(el))
        if (on.copyButtons) addCopyButtons(el, labels)
        if (on.lightbox) addImageLightbox(el, labels)
        if (on.tables) wrapTables(el)
        if (on.codeTabs) initCodeTabs(el)
        if (on.spoilers) initSpoilers(el, labels)
    }

    const call = Symbol('enhance')
    if (live.size === 0) {
        document.addEventListener('click', onClick)
        document.addEventListener('keydown', onKeydown)
    }
    live.add(call)

    return () => {
        if (!live.delete(call)) return
        for (const dispose of disposers) dispose()
        if (live.size === 0) {
            document.removeEventListener('click', onClick)
            document.removeEventListener('keydown', onKeydown)
        }
    }
}

export { DEFAULT_SELECTOR }
export type { Feature, Features } from '../features.ts'
export type { Labels } from '../markup.ts'
