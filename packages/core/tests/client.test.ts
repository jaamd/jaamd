/** The client script on a DOM, with no framework around it. */

import assert from 'node:assert/strict'
import { beforeEach, test } from 'node:test'
import { Window } from 'happy-dom'
import { codeTabsHtml } from '../src/render.ts'

const window = new Window({ url: 'https://example.dev/' })
const { document } = window

for (const name of [
    'document',
    'Element',
    'HTMLElement',
    'HTMLDialogElement',
    'IntersectionObserver',
    'getComputedStyle',
    'getSelection',
    'requestAnimationFrame',
] as const) {
    Object.defineProperty(globalThis, name, { value: window[name], configurable: true })
}

// After the globals: the module reads `document` when called, not when loaded.
const { enhance } = await import('../src/client/index.ts')

const tabs = codeTabsHtml('jaamd-tabs-x', ['npm', 'pnpm'])
const MARKDOWN = `
<h2>Setup</h2>
<pre><code>npm install</code></pre>
<table><tbody><tr><td>1</td></tr></tbody></table>
<img src="/a.png" alt="A diagram">
<p>The butler <span class="jaamd-spoiler">did it</span>.</p>
${tabs.open}${tabs.panelOpen(0)}<pre><code>a</code></pre>${tabs.panelClose}${tabs.panelOpen(1)}<pre><code>b</code></pre>${tabs.panelClose}${tabs.close}
`

/** A wrapper with the markdown in it, attached to the page. */
function mount(): HTMLElement {
    const root = document.createElement('div')
    root.className = 'jaamd-content'
    root.innerHTML = MARKDOWN
    document.body.append(root)
    return root as unknown as HTMLElement
}

const click = (el: Element | null) =>
    el?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }) as unknown as Event)

const selected = (root: HTMLElement) =>
    [...root.querySelectorAll('.jaamd-code-tab-btn')].map((btn) => btn.getAttribute('aria-selected'))

beforeEach(() => {
    document.body.innerHTML = ''
})

test('an element is enhanced: links, buttons, wrappers and roles', () => {
    const root = mount()
    const dispose = enhance(root)

    assert.equal(root.querySelector('h2')?.id, 'setup')
    assert.equal(root.querySelector('h2 > a.jaamd-heading-link')?.getAttribute('aria-label'), 'Link to section: Setup')
    assert.equal(root.querySelectorAll('pre > button.jaamd-copy-btn').length, 3)
    assert.ok(root.querySelector('.jaamd-table-wrapper > table'))
    assert.equal(
        root.querySelector('button.jaamd-lightbox-trigger > img')?.parentElement?.getAttribute('aria-label'),
        'Enlarge image: A diagram',
    )
    assert.equal(root.querySelector('.jaamd-spoiler')?.getAttribute('role'), 'button')
    assert.ok(root.querySelector('.jaamd-code-tabs[data-tabs-init]'))
    assert.ok(document.querySelector('dialog#jaamd-lightbox'))

    dispose()
})

test('only the given root is touched, and a second call adds nothing', () => {
    const first = mount()
    const second = mount()

    const dispose = enhance(first)
    assert.equal(second.querySelectorAll('.jaamd-copy-btn').length, 0)

    const again = enhance(first)
    assert.equal(first.querySelectorAll('.jaamd-copy-btn').length, 3)
    assert.equal(first.querySelectorAll('.jaamd-heading-link').length, 1)

    dispose()
    again()
})

test('a selector enhances every wrapper it matches', () => {
    const roots = [mount(), mount()]
    const dispose = enhance('.jaamd-content')
    for (const root of roots) assert.equal(root.querySelectorAll('.jaamd-copy-btn').length, 3)
    dispose()
})

test('a feature turned off is left out', () => {
    const root = mount()
    const dispose = enhance(root, { features: { copyButtons: false, lightbox: false, headingLinks: false } })

    assert.equal(root.querySelectorAll('.jaamd-copy-btn').length, 0)
    assert.equal(root.querySelectorAll('.jaamd-lightbox-trigger').length, 0)
    assert.equal(root.querySelectorAll('.jaamd-heading-link').length, 0)
    assert.ok(root.querySelector('.jaamd-table-wrapper'))

    dispose()
})

test('labels replace the English ones', () => {
    const root = mount()
    const dispose = enhance(root, { labels: { copy: 'Copia il codice', headingLink: 'Vai alla sezione' } })

    assert.equal(root.querySelector('.jaamd-copy-btn')?.getAttribute('aria-label'), 'Copia il codice')
    assert.equal(root.querySelector('.jaamd-heading-link')?.getAttribute('aria-label'), 'Vai alla sezione: Setup')

    dispose()
})

test('a click selects a tab and reveals a spoiler', () => {
    const root = mount()
    const dispose = enhance(root)

    click(root.querySelectorAll('.jaamd-code-tab-btn')[1])
    assert.deepEqual(selected(root), ['false', 'true'])
    assert.deepEqual(
        [...root.querySelectorAll('.jaamd-code-tab-panel')].map((panel) => panel.hasAttribute('data-active')),
        [false, true],
    )

    const spoiler = root.querySelector('.jaamd-spoiler')
    click(spoiler)
    assert.ok(spoiler?.hasAttribute('data-revealed'))
    assert.equal(spoiler?.getAttribute('aria-expanded'), 'true')

    dispose()
})

test('the cleanup releases the listeners once no call is left', () => {
    const first = mount()
    const second = mount()
    const disposeFirst = enhance(first)
    const disposeSecond = enhance(second)

    disposeFirst()
    click(second.querySelectorAll('.jaamd-code-tab-btn')[1])
    assert.deepEqual(selected(second), ['false', 'true'], 'a live call lost its listeners')

    disposeSecond()
    click(second.querySelectorAll('.jaamd-code-tab-btn')[0])
    assert.deepEqual(selected(second), ['false', 'true'], 'the listeners outlived every call')

    // Calling it twice changes nothing.
    disposeSecond()
})
