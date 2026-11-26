/** The search palette on a DOM: opening, the index, the results and the keys. */

import assert from 'node:assert/strict'
import { afterEach, beforeEach, test } from 'node:test'
import { Window, type Event, type HTMLDialogElement, type HTMLElement, type HTMLInputElement } from 'happy-dom'
import { SEARCH_INDEX_VERSION, type SearchIndex } from '../../src/search.ts'

const window = new Window({ url: 'https://example.dev/' })
const { document } = window

for (const name of ['document', 'navigator', 'customElements', 'HTMLElement', 'KeyboardEvent', 'MouseEvent'] as const) {
    Object.defineProperty(globalThis, name, { value: window[name], configurable: true })
}

// After the globals: the element class extends `HTMLElement` as it loads.
const { defineSiteSearch } = await import('../../src/components/search-palette.ts')

const opened: string[] = []
defineSiteSearch((href) => {
    opened.push(href)
})

const INDEX: SearchIndex = {
    version: SEARCH_INDEX_VERSION,
    sections: [
        { key: 'guide', label: 'Guide' },
        { key: 'api', label: 'API' },
    ],
    pages: [
        { title: 'Install', href: '/install/', section: 'guide' },
        { title: 'Deploy', href: '/deploy/', section: 'guide' },
        { title: 'Config', href: '/config/', section: 'api' },
    ],
    entries: [
        { page: 0, text: 'Install the package with npm.' },
        { page: 1, text: 'Build the site, then upload it.' },
        { page: 1, heading: 'Upload', anchor: 'upload', text: 'Upload the build to any static host.' },
        { page: 2, text: 'Every option of the config.' },
    ],
}

/** The markup `SearchPalette.astro` renders, with the hooks the element reads. */
const MARKUP = `
<site-search data-index-url="/search-index.json" data-loading="Loading" data-empty="No results for">
    <button data-trigger-desktop>Search <kbd data-shortcut>Ctrl K</kbd></button>
    <button data-trigger-icon>Search</button>
    <dialog data-overlay>
        <div data-backdrop></div>
        <input data-input />
        <button type="button" data-close>ESC</button>
        <div data-filters hidden>
            <button type="button" data-filter="" aria-pressed="true">All</button>
        </div>
        <ul data-results></ul>
    </dialog>
</site-search>`

let requests: string[] = []
let answer: () => Promise<Response>

beforeEach(() => {
    opened.length = 0
    requests = []
    answer = () => {
        return Promise.resolve(Response.json(INDEX))
    }
    globalThis.fetch = (url) => {
        requests.push(String(url))
        return answer()
    }
    // Parsed apart, then attached: the element connects with its children in place, as in a page.
    const container = document.createElement('div')
    container.innerHTML = MARKUP
    document.body.append(container)
})

afterEach(() => {
    document.body.innerHTML = ''
})

const palette = () => {
    return document.querySelector('site-search')!
}
const dialog = () => {
    return document.querySelector('dialog') as HTMLDialogElement
}
const input = () => {
    return document.querySelector('[data-input]') as HTMLInputElement
}

/** The rows of the list, as their text. */
const rows = () => {
    return [...document.querySelectorAll('[data-results] li')].map((li) => {
        return li.textContent?.trim() ?? ''
    })
}
const selected = () => {
    return document.querySelector('[data-results] [aria-selected="true"]')?.textContent?.trim()
}

const click = (selector: string) => {
    const element = document.querySelector(selector) as HTMLElement
    element.click()
}

/** A keydown on `target`, bubbling as the browser's does. */
const press = (
    target: { dispatchEvent(event: Event): boolean },
    key: string,
    init: { ctrlKey?: boolean; isComposing?: boolean } = {},
) => {
    target.dispatchEvent(new window.KeyboardEvent('keydown', { key, bubbles: true, ...init }))
}

/** Lets the index request settle and the results render. */
const settle = async () => {
    await new Promise((resolve) => {
        setTimeout(resolve, 0)
    })
}

const type = async (text: string) => {
    input().value = text
    input().dispatchEvent(new window.Event('input'))
    await settle()
}

test('Ctrl K opens the palette and loads the index once', async () => {
    press(document, 'k', { ctrlKey: true })
    await settle()

    assert.equal(dialog().open, true)
    assert.deepEqual(requests, ['/search-index.json'])

    press(document, 'k', { ctrlKey: true })
    press(document, 'k', { ctrlKey: true })
    await settle()
    assert.deepEqual(requests, ['/search-index.json'])
})

test('the trigger opens it, and Escape closes it and empties the field', async () => {
    click('[data-trigger-icon]')
    await type('deploy')
    assert.equal(dialog().open, true)

    press(document, 'Escape')
    assert.equal(dialog().open, false)
    assert.equal(input().value, '')
})

test('with an empty field it lists the opening pages of each section', async () => {
    press(document, 'k', { ctrlKey: true })
    await settle()

    assert.deepEqual(rows(), ['Guide', 'Install', 'Deploy', 'API', 'Config'])
    assert.equal(selected(), 'Install')
})

test('a query lists the matching pages and their headings', async () => {
    press(document, 'k', { ctrlKey: true })
    await type('upload')

    assert.equal(rows()[0]?.startsWith('Deploy'), true)
    assert.equal(
        rows().some((row) => {
            return row.startsWith('Upload')
        }),
        true,
    )
})

test('a query with no match says so', async () => {
    press(document, 'k', { ctrlKey: true })
    await type('zzz')

    assert.deepEqual(rows(), ['No results for “zzz”'])
})

test('a section filter keeps its pages only', async () => {
    press(document, 'k', { ctrlKey: true })
    await settle()

    const filters = document.querySelector('[data-filters]')!
    assert.equal(filters.hasAttribute('hidden'), false)
    click('[data-filter="api"]')

    assert.deepEqual(rows(), ['API', 'Config'])
    assert.equal(filters.querySelector('[data-filter="api"]')!.getAttribute('aria-pressed'), 'true')
    assert.equal(filters.querySelector('[data-filter=""]')!.getAttribute('aria-pressed'), 'false')
})

test('the arrows move the selection and Enter opens it', async () => {
    press(document, 'k', { ctrlKey: true })
    await settle()

    press(input(), 'ArrowDown')
    assert.equal(selected(), 'Deploy')
    press(input(), 'ArrowUp')
    press(input(), 'ArrowUp')
    assert.equal(selected(), 'Install')

    press(input(), 'ArrowDown')
    press(input(), 'Enter')
    assert.deepEqual(opened, ['/deploy/'])
    assert.equal(dialog().open, false)
})

test('Enter while composing with an input method opens nothing', async () => {
    press(document, 'k', { ctrlKey: true })
    await settle()

    press(input(), 'Enter', { isComposing: true })
    assert.deepEqual(opened, [])
})

test('a failed index request is tried again on the next opening', async () => {
    answer = () => {
        return Promise.resolve(new Response('', { status: 500 }))
    }
    press(document, 'k', { ctrlKey: true })
    await settle()
    assert.deepEqual(rows(), ['Loading'])

    press(document, 'Escape')
    answer = () => {
        return Promise.resolve(Response.json(INDEX))
    }
    press(document, 'k', { ctrlKey: true })
    await settle()

    assert.equal(requests.length, 2)
    assert.equal(rows().includes('Install'), true)
    assert.equal(palette().isConnected, true)
})
