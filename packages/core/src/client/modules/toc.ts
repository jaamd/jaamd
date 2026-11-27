import { CLASS } from '../../markup.ts'

/** The observer watching each nav: a new run replaces the previous one's. */
const observers = new WeakMap<HTMLElement, IntersectionObserver>()

/** `link.hash` is percent-encoded; a malformed escape is used verbatim. */
function decodeId(raw: string): string {
    try {
        return decodeURIComponent(raw)
    } catch {
        return raw
    }
}

/** Where an anchored heading comes to rest, in px, whatever unit the CSS uses. */
function scrollMarginTop(heading: Element): number {
    const parsed = Number.parseFloat(getComputedStyle(heading).scrollMarginTop)
    return Number.isFinite(parsed) ? parsed : 80
}

export interface TocOptions {
    /** The navs to watch, inside `root`: JAAMD's `:::toc` by default. */
    selector?: string
}

/** Marks the entry whose section is in view, in every nav that `selector`
 *  matches. The links stay plain anchors. Returns what stops the watching. */
export function initToc(root: ParentNode, options: TocOptions = {}): () => void {
    const { selector = `.${CLASS.toc}` } = options
    const navs = [...root.querySelectorAll<HTMLElement>(selector)]
    // Only these are stopped by the returned function: a later run's are its own.
    const created = new Map<HTMLElement, IntersectionObserver>()

    for (const nav of navs) {
        observers.get(nav)?.disconnect()
        observers.delete(nav)

        const links = new Map<Element, HTMLAnchorElement>()

        nav.querySelectorAll<HTMLAnchorElement>('a[href*="#"]').forEach((link) => {
            const id = link.hash.slice(1)
            if (!id) {
                return
            }

            // A hand-written anchor can be wrong: the link just never lights up.
            const target = document.getElementById(decodeId(id))
            if (target) {
                links.set(target, link)
            }
        })

        const visible = new Set<Element>()
        const order = [...links.keys()]
        const firstHeading = order[0]
        // No link found its heading: nothing to light up.
        if (firstHeading === undefined) {
            continue
        }

        const setCurrent = (target: Element | null) => {
            links.forEach((link, key) => {
                if (key === target) {
                    link.setAttribute('aria-current', 'location')
                } else {
                    link.removeAttribute('aria-current')
                }
            })
        }

        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        visible.add(entry.target)
                    } else {
                        visible.delete(entry.target)
                    }
                }

                // Several headings can share the band; the topmost one wins.
                const current =
                    order.find((el) => {
                        return visible.has(el)
                    }) ?? null
                if (current) {
                    setCurrent(current)
                }
            },
            {
                // Band from where an anchored heading rests down to 30% of the viewport.
                rootMargin: `-${scrollMarginTop(firstHeading)}px 0px -70% 0px`,
            },
        )

        for (const target of links.keys()) {
            observer.observe(target)
        }
        observers.set(nav, observer)
        created.set(nav, observer)
    }

    return () => {
        for (const [nav, observer] of created) {
            observer.disconnect()
            if (observers.get(nav) === observer) {
                observers.delete(nav)
            }
        }
    }
}
