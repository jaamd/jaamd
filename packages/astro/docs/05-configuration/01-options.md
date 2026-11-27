---
description: 'Every option of the jaamd() integration, with its type and default.'
---

# Options

`jaamd()` works with no options. Each one changes a single behaviour:

```ts
jaamd({
    theme: 'github-light',
    features: { lightbox: false },
})
```

| Option                                       | Type               | Default            | What it does                            |
| -------------------------------------------- | ------------------ | ------------------ | --------------------------------------- |
| [`theme`](02-theme.md)                       | `string \| object` | Astro's            | The Shiki theme of the code blocks      |
| [`selector`](03-selector.md)                 | `string`           | `".jaamd-content"` | The elements the client script enhances |
| [`defaultVariables`](04-defaultVariables.md) | `boolean`          | `true`             | The default CSS variables on every page |
| [`features`](05-features.md)                 | `object`           | all on             | The features to turn off                |
| [`labels`](06-labels.md)                     | `object`           | English            | The text JAAMD writes into the page     |
