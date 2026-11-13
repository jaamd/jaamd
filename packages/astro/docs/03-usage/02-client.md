# Client script

A dependency-free ES module enhances the rendered markdown. The integration
injects it on every page; it runs on the elements matching
[`selector`](../01-getting-started/02-options.md#selector). Events are delegated
on `document`; per-element setup re-runs on every `astro:page-load`, so it
keeps working across View Transitions.

Table wrappers and heading anchors come from the build. The module adds them
only to markup that skipped the processor (`set:html`, HTML from a CMS).

| Enhancement       | Behaviour                                                                                                                                                 |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Heading links     | Adds an anchor link to `h1`–`h6` where the build did not. Fills in a missing `id` with a `github-slugger`-compatible slug, de-duplicated across the page. |
| Table of contents | Marks the `:::toc` entry whose section is on screen with `aria-current="location"`.                                                                       |
| Copy buttons      | Adds a copy button to every `pre`. Without clipboard access it selects the code instead. The only clipboard write in the package.                         |
| Image lightbox    | Wraps each image in a button that opens it in a modal `<dialog>`. Closes on <kbd>Esc</kbd>, the ✕ button or a click outside the image.                    |
| Responsive tables | Wraps a `table` in a horizontally scrollable container where the build did not.                                                                           |
| Code tabs         | Drives the `:::code-tabs` tablist.                                                                                                                        |
| Spoilers          | Reveals `.spoiler` content on click or <kbd>Enter</kbd>/<kbd>Space</kbd>.                                                                                 |

## Keyboard

| Element   | Keys                                                                                                                                                  |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Code tabs | <kbd>←</kbd> <kbd>→</kbd> move between tabs, <kbd>Home</kbd> <kbd>End</kbd> jump to first/last. Panels are focusable so wide samples can be scrolled. |
| Spoilers  | <kbd>Tab</kbd> to focus, <kbd>Enter</kbd> or <kbd>Space</kbd> to reveal. Hover does not reveal.                                                       |
| Lightbox  | <kbd>Tab</kbd> to an image, <kbd>Enter</kbd> or <kbd>Space</kbd> to open, <kbd>Esc</kbd> to close. Focus returns to the image.                        |

`<details>` animates in CSS, no script: height where the browser supports
`interpolate-size`, a fade elsewhere.

Under `prefers-reduced-motion: reduce` JAAMD's CSS transitions are disabled.

With scripting disabled, tables still scroll, heading anchors work and every
code tab panel is shown.

## Image lightbox

Opening and closing are the browser's own: the image button and the ✕ button
are [invoker commands](https://developer.mozilla.org/en-US/docs/Web/API/Invoker_Commands_API)
on the `<dialog>`, and `closedby="any"` closes it on a click outside the image.

| Browser       | Lightbox | Click outside closes               |
| ------------- | -------- | ---------------------------------- |
| Chrome / Edge | 135+     | 134+                               |
| Firefox       | 144+     | 141+                               |
| Safari        | 26.2+    | not yet: <kbd>Esc</kbd> and ✕ only |

Older browsers show the image as a plain image.

### Excluding images from the lightbox

Linked images are skipped automatically, so badges keep navigating:

```markdown
[![build](https://img.shields.io/badge/build-passing-green)](https://github.com/you/repo)
```

Opt a standalone image out with `data-no-lightbox`:

```html
<img src="/diagram.svg" alt="Architecture diagram" data-no-lightbox />
```
