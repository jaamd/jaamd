---
description: Turn off the features of JAAMD, in the build and in the browser.
---

# `features`

Every feature is on. Set one to `false` to turn it off, in the build and in the
client script.

| Type                      | Default |
| ------------------------- | ------- |
| `Record<string, boolean>` | all on  |

| Feature        | What                                         | Where         |
| -------------- | -------------------------------------------- | ------------- |
| `alerts`       | `> [!NOTE]` blockquotes                      | build         |
| `codeTabs`     | `:::code-tabs` blocks                        | build, client |
| `toc`          | `:::toc` blocks                              | build, client |
| `spoilers`     | `:spoiler[…]` and `:::spoiler`               | build, client |
| `directives`   | The `:::` syntax, for directives of your own | build         |
| `tables`       | Scroll container around tables               | build, client |
| `headingLinks` | Anchor on every heading                      | build, client |
| `copyButtons`  | Copy button on code blocks                   | client        |
| `lightbox`     | Images open in a dialog                      | client        |

## Use cases

### Images that should not open in a dialog

```ts
jaamd({ features: { lightbox: false } })
```

To leave out a single image instead, see
[Excluding images from the lightbox](../03-usage/02-client.md#excluding-images-from-the-lightbox).

### Markdown with colons of its own

A directive no plugin claims keeps its content: `10:30` and `Error:Fatal` read
as written. To leave the `:::` syntax out entirely, turn off the three features
written in it as well:

```ts
jaamd({ features: { directives: false, codeTabs: false, toc: false, spoilers: false } })
```

## Limits

`directives` stays on while `codeTabs`, `toc` or `spoilers` is.
