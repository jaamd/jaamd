# Search

Readers can open search from the header or with `Ctrl+K` (`⌘K` on macOS).
Results support arrow-key selection, `Enter` to open and `Escape` to close.

## What is indexed

The build cuts every page at its `##` and `###` headings and indexes each part
with:

- the page title, its chapter and its `keywords`;
- the heading;
- the text below it, excluding code blocks, images and directives.

Drafts are left out of production builds. The index is emitted at
`<routeBase>/search-index.json`, one per language, loaded on first use and
cached for the session. It requires no configuration.

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
the docs have [sections](./03-structure.md#sections), it lists the first pages
of each, and buttons above the results limit the search to one section.

The index holds the text of every page, so its size grows with the
documentation.
