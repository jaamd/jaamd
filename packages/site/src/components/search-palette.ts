/** The search palette's element: the dialog, the index it loads on demand,
 *  the results and the keys. Navigation is the caller's, so the element runs
 *  outside Astro too. */
import {
    SEARCH_INDEX_VERSION,
    getSnippet,
    markWords,
    openingPages,
    queryTerms,
    search,
    type SearchIndex,
    type SearchPage,
} from '../search.ts'

const EMPTY_INDEX: SearchIndex = { version: SEARCH_INDEX_VERSION, sections: [], pages: [], entries: [] }

/** How a result is opened: Astro's `navigate`, set by `defineSiteSearch`. */
let navigateTo: (href: string) => void

class SiteSearch extends HTMLElement {
    #overlay!: HTMLDialogElement
    #input!: HTMLInputElement
    #filters!: HTMLElement
    #list!: HTMLUListElement
    #index: SearchIndex | null = null
    #request: Promise<SearchIndex> | null = null
    /** The selectable rows, in display order. */
    #options: { li: HTMLLIElement; href: string }[] = []
    #selected = 0
    /** The section key results are limited to; empty for all. */
    #section = ''
    #restoreFocus: HTMLElement | null = null
    #previousOverflow = ''
    /** The persisted header is moved on every navigation, which disconnects
     *  and reconnects it: the children's listeners are bound once. */
    #bound = false

    get #open() {
        return this.#overlay.open
    }

    connectedCallback() {
        document.addEventListener('keydown', this.#onGlobalKey)
        if (this.#bound) {
            return
        }
        this.#bound = true

        this.#overlay = this.querySelector('[data-overlay]')!
        this.#input = this.querySelector('[data-input]')!
        this.#filters = this.querySelector('[data-filters]')!
        this.#list = this.querySelector('[data-results]')!

        if (/Mac|iPod|iPhone|iPad/.test(navigator.userAgent)) {
            this.querySelector('[data-shortcut]')!.textContent = '⌘K'
        }

        for (const sel of ['[data-trigger-desktop]', '[data-trigger-icon]']) {
            const trigger = this.querySelector<HTMLElement>(sel)!
            trigger.addEventListener('click', () => {
                return this.#setOpen(true)
            })
            trigger.addEventListener('mouseenter', () => {
                return void this.#loadIndex()
            })
            trigger.addEventListener('focus', () => {
                return void this.#loadIndex()
            })
        }

        this.querySelector('[data-backdrop]')!.addEventListener('click', () => {
            return this.#setOpen(false)
        })
        // Escape closes a modal dialog on its own: the cleanup runs on every close.
        this.#overlay.addEventListener('close', () => {
            return this.#onClose()
        })
        this.querySelector('[data-close]')!.addEventListener('click', () => {
            return this.#setOpen(false)
        })
        this.#filters.addEventListener('click', (e) => {
            const button = (e.target as Element).closest<HTMLButtonElement>('[data-filter]')
            if (button) {
                this.#filter(button.dataset.filter ?? '')
            }
        })

        this.#input.addEventListener('input', () => {
            return this.#render()
        })
        this.#input.addEventListener('keydown', (e) => {
            return this.#onInputKey(e)
        })
    }

    disconnectedCallback() {
        document.removeEventListener('keydown', this.#onGlobalKey)
    }

    #onGlobalKey = (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault()
            this.#setOpen(!this.#open)
        } else if (e.key === 'Escape' && this.#open) {
            e.preventDefault()
            this.#setOpen(false)
        }
    }

    #onInputKey(e: KeyboardEvent) {
        // Enter also confirms a character being composed with an input method.
        if (e.isComposing) {
            return
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault()
            this.#select(Math.min(this.#selected + 1, this.#options.length - 1))
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            this.#select(Math.max(this.#selected - 1, 0))
        } else if (e.key === 'Enter') {
            const option = this.#options[this.#selected]
            if (option) {
                this.#go(option.href)
            }
        }
    }

    #loadIndex(): Promise<SearchIndex> {
        if (this.#index) {
            return Promise.resolve(this.#index)
        }
        if (!this.#request) {
            const url = this.dataset.indexUrl!
            this.#request = fetch(url)
                .then((res) => {
                    if (!res.ok) {
                        throw new Error(`${url} answered ${res.status}`)
                    }
                    return res.json()
                })
                .then((data: SearchIndex) => {
                    this.#index = data
                    this.#renderFilters(data)
                    return data
                })
                .catch(() => {
                    // Drop the failed promise so a later attempt can retry.
                    this.#request = null
                    return EMPTY_INDEX
                })
        }
        return this.#request
    }

    #setOpen(open: boolean) {
        if (open === this.#open) {
            return
        }
        if (!open) {
            this.#overlay.close()
            return
        }

        this.#restoreFocus = document.activeElement as HTMLElement | null
        this.#previousOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        this.#overlay.showModal()
        this.#input.focus()
        void this.#loadIndex().then(() => {
            return this.#render()
        })
        this.#render()
    }

    #onClose() {
        document.body.style.overflow = this.#previousOverflow
        this.#input.value = ''
        this.#restoreFocus?.focus?.()
    }

    #go(href: string) {
        this.#setOpen(false)
        navigateTo(href)
    }

    /** One button per section, after "All"; none with fewer than two. */
    #renderFilters(index: SearchIndex) {
        // "All" is in the markup: the sections' buttons follow it.
        const all = this.#filters.querySelector('[data-filter]')
        if (!all) {
            return
        }
        this.#filters.replaceChildren(all)
        this.#filters.hidden = index.sections.length < 2
        for (const { key, label } of index.sections) {
            const button = document.createElement('button')
            button.type = 'button'
            button.dataset.filter = key
            button.className = 'site-search-filter jaad-search-filter'
            button.textContent = label
            this.#filters.append(button)
        }
        this.#filter(this.#section)
    }

    #filter(section: string) {
        this.#section = section
        for (const button of this.#filters.querySelectorAll<HTMLElement>('[data-filter]')) {
            button.setAttribute('aria-pressed', String(button.dataset.filter === section))
        }
        this.#render()
        this.#input.focus()
    }

    #select(i: number) {
        this.#selected = i
        const option = this.#options[i]
        if (option) {
            this.#input.setAttribute('aria-activedescendant', option.li.id)
        }
        this.#options.forEach(({ li }, n) => {
            return li.setAttribute('aria-selected', String(n === i))
        })
        option?.li.scrollIntoView({ block: 'nearest' })
    }

    #marked(text: string, terms: string[]): DocumentFragment {
        const frag = document.createDocumentFragment()
        for (const part of markWords(text, terms)) {
            if (part.match) {
                const mark = document.createElement('mark')
                mark.className = 'site-search-mark jaad-search-mark'
                mark.textContent = part.text
                frag.append(mark)
            } else {
                frag.append(document.createTextNode(part.text))
            }
        }
        return frag
    }

    #render() {
        this.#list.replaceChildren()
        this.#options = []
        this.#input.removeAttribute('aria-activedescendant')

        if (!this.#index) {
            this.#list.append(this.#message(this.dataset.loading ?? 'Loading...'))
            return
        }

        const query = this.#input.value
        const terms = queryTerms(query)
        const section = this.#section || undefined

        if (terms.length === 0) {
            for (const group of openingPages(this.#index, section)) {
                if (group.label) {
                    this.#list.append(this.#label(group.label))
                }
                for (const page of group.pages) {
                    this.#option(page.href, this.#pageRow(page, [], ''))
                }
            }
        } else {
            for (const group of search(this.#index, query, section)) {
                const snippet = group.intro ? getSnippet(group.intro.text, terms) : ''
                this.#option(group.page.href, this.#pageRow(group.page, terms, snippet))
                for (const hit of group.hits) {
                    const li = this.#option(hit.href, this.#row(hit.entry.heading ?? '', terms))
                    li.classList.add('site-search-result-heading', 'jaad-search-result-heading')
                    this.#snippet(li, getSnippet(hit.entry.text, terms), terms)
                }
            }
        }

        if (this.#options.length === 0) {
            this.#list.append(this.#message(`${this.dataset.empty ?? 'No results for'} “${query}”`))
            return
        }
        this.#select(0)
    }

    /** A selectable row: the list item, given its content. */
    #option(href: string, content: HTMLElement): HTMLLIElement {
        const i = this.#options.length
        const li = document.createElement('li')
        li.id = `search-option-${i}`
        li.setAttribute('role', 'option')
        li.className = 'site-search-result jaad-search-result'
        li.addEventListener('click', () => {
            return this.#go(href)
        })
        li.addEventListener('mouseenter', () => {
            return this.#select(i)
        })
        li.append(content)
        this.#list.append(li)
        this.#options.push({ li, href })
        return li
    }

    #row(title: string, terms: string[]): HTMLElement {
        const head = document.createElement('div')
        head.className = 'site-search-result-head jaad-search-result-head'
        const span = document.createElement('span')
        span.className = 'site-search-result-title jaad-search-result-title'
        span.append(this.#marked(title, terms))
        head.append(span)
        return head
    }

    #pageRow(page: SearchPage, terms: string[], snippet: string): HTMLElement {
        const fragment = document.createElement('div')
        const head = this.#row(page.title, terms)
        if (page.chapter) {
            const badge = document.createElement('span')
            badge.className = 'site-search-result-badge jaad-search-result-badge'
            badge.textContent = page.chapter
            head.append(badge)
        }
        fragment.append(head)
        this.#snippet(fragment, snippet, terms)
        return fragment
    }

    #snippet(parent: HTMLElement, text: string, terms: string[]) {
        if (!text) {
            return
        }
        const p = document.createElement('p')
        p.className = 'site-search-result-snippet jaad-search-result-snippet'
        p.append(this.#marked(text, terms))
        parent.append(p)
    }

    #label(text: string): HTMLLIElement {
        const li = document.createElement('li')
        li.setAttribute('role', 'presentation')
        li.className = 'site-search-group jaad-search-group'
        li.textContent = text
        return li
    }

    #message(text: string): HTMLLIElement {
        const li = document.createElement('li')
        li.className = 'site-search-message jaad-search-message'
        li.textContent = text
        return li
    }
}

/** Registers `<site-search>`, opening results with `navigate`. */
export function defineSiteSearch(navigate: (href: string) => void): void {
    navigateTo = navigate
    if (!customElements.get('site-search')) {
        customElements.define('site-search', SiteSearch)
    }
}
