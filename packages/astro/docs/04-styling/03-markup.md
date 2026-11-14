# Markup and classes

What JAAMD emits, for styling it or writing a custom wrapper. _Build_ markup is
in the HTML from the markdown processor; _client_ markup is added at runtime by
the [client script](../03-usage/02-client.md).

The markup and its classes are the public contract: the stylesheets, the themes
and the client script all rely on them. Every class starts with `jaamd-`,
except the alerts, which keep the names GitHub gives them.

| Feature           | Elements                                                                                                                     | Attributes and states                                                              | From                                                 |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Wrapper           | `.jaamd-content`                                                                                                             | —                                                                                  | `<MarkdownContent>` or your own                      |
| Heading anchor    | `a.jaamd-heading-link`, last child of `h1`–`h6`                                                                              | `href="#<id>"`, `aria-label`                                                       | build; client where the build did not                |
| Table wrapper     | `div.jaamd-table-wrapper` around `table`                                                                                     | —                                                                                  | build; client where the build did not                |
| Alert             | `div.markdown-alert.markdown-alert-<type>`, type `note`, `tip`, `important`, `warning` or `caution`                          | `dir="auto"`                                                                       | build                                                |
| Alert title       | `p.markdown-alert-title` with an `svg.octicon`                                                                               | —                                                                                  | build                                                |
| Code tabs         | `div.jaamd-code-tabs#jaamd-tabs-<hash>` › `div.jaamd-code-tab-buttons[role=tablist]` › `button.jaamd-code-tab-btn[role=tab]` | `aria-selected`, roving `tabindex`, `data-tab-index`, `aria-controls`              | build; `data-tabs-init` on the group from the client |
| Code tab panel    | `div.jaamd-code-tab-panel[role=tabpanel]` wrapping the `pre`                                                                 | `data-active` on the open one, `data-tab-index`, `aria-labelledby`                 | build                                                |
| Table of contents | `nav.jaamd-toc` › optional `p.jaamd-toc-title`, then your list                                                               | `aria-label`; the current link gets `aria-current="location"`                      | build; current link from the client                  |
| Copy button       | `button.jaamd-copy-btn`, last child of `pre`, with `svg.jaamd-copy-icon` and `svg.jaamd-copied-icon`                         | `data-copied="true"` after a copy, `"manual"` when the code was selected instead   | client                                               |
| Announcements     | `div#jaamd-live.jaamd-live[role=status]` in `body`                                                                           | —                                                                                  | client                                               |
| Lightbox trigger  | `button.jaamd-lightbox-trigger` around each `img`                                                                            | `commandfor="jaamd-lightbox"`, `command="show-modal"`                              | client                                               |
| Lightbox          | `dialog#jaamd-lightbox.jaamd-lightbox` in `body`, with `img.jaamd-lightbox-img` and `button.jaamd-lightbox-close`            | `closedby="any"`, `[open]`                                                         | client                                               |
| Spoiler           | `span.jaamd-spoiler` from `:spoiler[…]`, `div.jaamd-spoiler` from `:::spoiler`                                               | `data-revealed`, `role="button"`, `tabindex`, `aria-expanded`, `data-spoiler-init` | build; states from the client                        |
