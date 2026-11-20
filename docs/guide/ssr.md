# SSR / Nuxt

The components render on the server and attach their listeners after mounting, so no
`<ClientOnly>` wrapper is needed. Positions come from props, so the server output already has
the right layout.

Until an element mounts, its text direction is `ltr`: [logical handles](./rtl#logical-handles)
and `flowAnchor="auto"` resolve against the real direction on the client.

This documentation is itself server-rendered, demos included.

## Nuxt

No module or plugin is needed. Add the stylesheet to `nuxt.config.ts`:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  css: ['vue-drag-resize-kit/style.css'],
})
```

Then import the components where you use them, as in [Getting started](./getting-started#usage):

```ts
import { DraggableResizable } from 'vue-drag-resize-kit'
```

To load the stylesheet only on the pages that use the components, leave it out of
`nuxt.config.ts` and import it in those components instead:

```ts
import 'vue-drag-resize-kit/style.css'
```
