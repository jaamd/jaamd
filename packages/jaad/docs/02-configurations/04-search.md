---
description: What JAAD's search indexes, how it ranks results, and the keyboard shortcuts.
---

# Search

Every JAAD site has full-text search, with no configuration and no external
service. Readers open it from the header or with <kbd>Ctrl</kbd>+<kbd>K</kbd>
(<kbd>⌘</kbd>+<kbd>K</kbd> on macOS).

## What is indexed

The build cuts every page at its `##` and `###` headings and indexes each part
with:

- the page title, its chapter and its `keywords`;
- the heading;
- the text below it, excluding code blocks, images and directives.

Drafts are left out of production builds. The index is emitted at
`<routeBase>/search-index.json`, one per language, loaded on first use and
cached for the session. It holds the text of every page, so its size grows with
the documentation.

## How results are found

- Every word of the query must appear in a part of a page or in the page's
  title, chapter or keywords.
- A word also matches the words it starts: `config` finds `configuration`.
- Case and accents are ignored: `citta` finds `città`.
- A match in the title ranks first, then the heading, the keywords, the
  chapter and the text.

Results are grouped by page. Under each page are the headings that matched,
and choosing one opens the page at that heading.

With an empty query, search lists the first pages of the documentation. When
the docs have [sections](../01-getting-started/02-pages.md#sections), it lists
the first pages of each, and buttons above the results limit the search to one
section.

## Keyboard shortcuts

| Where  | Keys                                                      | Action                  |
| ------ | --------------------------------------------------------- | ----------------------- |
| Search | <kbd>Ctrl</kbd>+<kbd>K</kbd> or <kbd>⌘</kbd>+<kbd>K</kbd> | Open the search palette |
| Search | <kbd>↑</kbd> <kbd>↓</kbd>                                 | Select a result         |
| Search | <kbd>Enter</kbd>                                          | Open the result         |
| Search | <kbd>Esc</kbd>                                            | Close the palette       |
| Page   | <kbd>←</kbd>                                              | Open the previous page  |
| Page   | <kbd>→</kbd>                                              | Open the next page      |

The page shortcuts are off while:

- an input, textarea, select or editable element has focus;
- the focus is inside a sideways-scrollable area, such as a wide table or code
  block;
- a modifier key is held.
