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
    'HTMLButtonElement',
    'HTMLDialogElement',
    'KeyboardEvent',
    'IntersectionObserver',
    'getComputedStyle',
    'getSelection',
    'requestAnimationFrame',
] as const) {
    Object.defineProperty(globalThis, name, { value: window[name], configurable: true })
}

// happy-dom has no invoker commands; the browsers JAAMD targets do.
Object.defineProperty(window.HTMLButtonElement.prototype, 'command', { value: '', writable: true, configurable: true })

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

const click = (el: Element | null) => {
    return el?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }) as unknown as Event)
}

const selected = (root: HTMLElement) => {
    return [...root.querySelectorAll('.jaamd-code-tab-btn')].map((btn) => {
        return btn.getAttribute('aria-selected')
    })
}

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
    for (const root of roots) {
        assert.equal(root.querySelectorAll('.jaamd-copy-btn').length, 3)
    }
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
        [...root.querySelectorAll('.jaamd-code-tab-panel')].map((panel) => {
            return panel.hasAttribute('data-active')
        }),
        [false, true],
    )

    const spoiler = root.querySelector('.jaamd-spoiler')
    click(spoiler)
    assert.ok(spoiler?.hasAttribute('data-revealed'))

    dispose()
})

test('a revealed spoiler is plain content again, and a click inside keeps it so', () => {
    const root = mount()
    root.insertAdjacentHTML('beforeend', '<div class="jaamd-spoiler"><p>See <a href="#x">this</a>.</p></div>')
    const dispose = enhance(root)

    const spoiler = root.querySelector('div.jaamd-spoiler')!
    assert.equal(spoiler.getAttribute('role'), 'button')
    assert.equal(spoiler.getAttribute('aria-expanded'), 'false')

    click(spoiler)
    assert.ok(spoiler.hasAttribute('data-revealed'))
    assert.equal(spoiler.getAttribute('role'), null, 'the content is still read as a button label')
    assert.equal(spoiler.getAttribute('aria-label'), null)
    assert.equal(spoiler.getAttribute('tabindex'), '-1')

    click(spoiler.querySelector('a'))
    assert.ok(spoiler.hasAttribute('data-revealed'), 'a click on a link hid the spoiler again')

    dispose()
})

test('a picture is wrapped whole, so its sources still apply', () => {
    const root = mount()
    root.insertAdjacentHTML(
        'beforeend',
        '<picture><source srcset="/a.avif" type="image/avif"><img src="/a.png" alt="Photo"></picture>',
    )
    const dispose = enhance(root)

    const picture = root.querySelector('picture')!
    assert.equal(picture.parentElement?.className, 'jaamd-lightbox-trigger')
    assert.equal(picture.querySelector('img')?.parentElement, picture, 'the image left its picture')
    assert.equal(picture.querySelector('img')?.title, '', 'the image got a title it did not have')

    dispose()
})

test('without invoker commands, images are left as they are', () => {
    const descriptor = Object.getOwnPropertyDescriptor(window.HTMLButtonElement.prototype, 'command')!
    delete (window.HTMLButtonElement.prototype as { command?: string }).command
    const root = mount()

    try {
        const dispose = enhance(root)
        assert.equal(root.querySelectorAll('.jaamd-lightbox-trigger').length, 0)
        dispose()
    } finally {
        Object.defineProperty(window.HTMLButtonElement.prototype, 'command', descriptor)
    }
})

const press = (el: Element | null, key: string) => {
    return el?.dispatchEvent(new window.KeyboardEvent('keydown', { key, bubbles: true }) as unknown as Event)
}

test('arrow keys, Home and End move between tabs, wrapping at the ends', () => {
    const root = mount()
    const dispose = enhance(root)
    const buttons = () => {
        return root.querySelectorAll('.jaamd-code-tab-btn')
    }

    press(buttons()[0], 'ArrowRight')
    assert.deepEqual(selected(root), ['false', 'true'])
    press(buttons()[1], 'ArrowRight')
    assert.deepEqual(selected(root), ['true', 'false'], 'the last tab does not wrap to the first')
    press(buttons()[0], 'ArrowLeft')
    assert.deepEqual(selected(root), ['false', 'true'], 'the first tab does not wrap to the last')
    press(buttons()[1], 'Home')
    assert.deepEqual(selected(root), ['true', 'false'])
    press(buttons()[0], 'End')
    assert.deepEqual(selected(root), ['false', 'true'])

    dispose()
})

/** Replaces the clipboard for one test; `undefined` leaves none. */
function withClipboard(writeText: ((text: string) => Promise<void>) | undefined) {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis.navigator, 'clipboard')
    Object.defineProperty(globalThis.navigator, 'clipboard', {
        value: writeText ? { writeText } : undefined,
        configurable: true,
    })
    return () => {
        if (descriptor) {
            Object.defineProperty(globalThis.navigator, 'clipboard', descriptor)
        } else {
            delete (globalThis.navigator as { clipboard?: unknown }).clipboard
        }
    }
}

/** Lets the click handler's awaited clipboard write settle. */
const settle = () => {
    return new Promise((resolve) => {
        return setTimeout(resolve, 0)
    })
}

test('the copy button writes the code, and selects it when there is no clipboard', async () => {
    const root = mount()
    const dispose = enhance(root)
    const button = root.querySelector('pre')!.querySelector<HTMLElement>('.jaamd-copy-btn')!

    const written: string[] = []
    let restore = withClipboard(async (text) => {
        written.push(text)
    })
    try {
        click(button)
        await settle()
        assert.deepEqual(written, ['npm install'])
        assert.equal(button.dataset.copied, 'true')
    } finally {
        restore()
    }

    restore = withClipboard(undefined)
    try {
        click(button)
        await settle()
        assert.equal(button.dataset.copied, 'manual')
        assert.equal(document.getSelection()?.toString(), 'npm install', 'the code was not selected')
    } finally {
        restore()
    }

    dispose()
})

test('the lightbox shows the image of the button that opened it', () => {
    const root = mount()
    const dispose = enhance(root)
    const trigger = root.querySelector('.jaamd-lightbox-trigger')!
    const dialog = document.getElementById('jaamd-lightbox')!

    const event = new window.Event('command')
    Object.assign(event, { command: 'show-modal', source: trigger })
    dialog.dispatchEvent(event)

    const preview = dialog.querySelector('img')!
    assert.match(preview.src, /\/a\.png$/)
    assert.equal(preview.alt, 'A diagram')

    dispose()
})

test('headings with the same text get numbered ids, as GitHub gives them', () => {
    const root = document.createElement('div')
    root.className = 'jaamd-content'
    root.innerHTML = '<h2>Setup</h2><h2>Setup</h2><h3>Setup</h3>'
    document.body.append(root)
    const dispose = enhance(root as unknown as HTMLElement)

    assert.deepEqual(
        [...root.querySelectorAll('h2, h3')].map((heading) => {
            return heading.id
        }),
        ['setup', 'setup-1', 'setup-2'],
    )

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

test("the cleanup of an earlier TOC run leaves a later run's observer alone", async () => {
    const { initToc } = await import('../src/client/modules/toc.ts')

    const observers: { disconnected: boolean }[] = []
    class FakeObserver {
        disconnected = false
        constructor() {
            observers.push(this)
        }
        observe() {}
        disconnect() {
            this.disconnected = true
        }
    }
    Object.defineProperty(globalThis, 'IntersectionObserver', { value: FakeObserver, configurable: true })

    const root = document.createElement('div')
    root.innerHTML = '<h2 id="setup">Setup</h2><nav class="jaamd-toc"><a href="#setup">Setup</a></nav>'
    document.body.append(root)

    try {
        const stopFirst = initToc(root as unknown as ParentNode)
        const stopSecond = initToc(root as unknown as ParentNode)
        assert.equal(observers.length, 2)
        assert.equal(observers[0].disconnected, true, 'the second run did not replace the first')

        stopFirst()
        assert.equal(observers[1].disconnected, false, "the first cleanup stopped the second run's observer")

        stopSecond()
        assert.equal(observers[1].disconnected, true)
    } finally {
        root.remove()
        Object.defineProperty(globalThis, 'IntersectionObserver', {
            value: window.IntersectionObserver,
            configurable: true,
        })
    }
})

test('a selector points the TOC watching at navs of another markup', async () => {
    const { initToc } = await import('../src/client/index.ts')

    const observed: Element[] = []
    class FakeObserver {
        observe(target: Element) {
            observed.push(target)
        }
        disconnect() {}
    }
    Object.defineProperty(globalThis, 'IntersectionObserver', { value: FakeObserver, configurable: true })

    const root = document.createElement('div')
    root.innerHTML = '<h2 id="setup">Setup</h2><nav id="side"><a href="#setup">Setup</a></nav>'
    document.body.append(root)

    try {
        initToc(root as unknown as ParentNode)()
        assert.equal(observed.length, 0, 'a nav without the JAAMD class was watched by default')

        const stop = initToc(root as unknown as ParentNode, { selector: '#side' })
        assert.deepEqual(
            observed.map((target) => {
                return target.id
            }),
            ['setup'],
        )
        stop()
    } finally {
        root.remove()
        Object.defineProperty(globalThis, 'IntersectionObserver', {
            value: window.IntersectionObserver,
            configurable: true,
        })
    }
})
