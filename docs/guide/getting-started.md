<script setup>
import Basic from '../demos/Basic.vue'
</script>

# Getting started

`vue-drag-resize-kit` is a draggable and resizable component for Vue 3, with snapping, alignment
guides and first-class TypeScript support.

Originally forked from `vue3-draggable-resizable` and rewritten from scratch. Switching over? See
[Migrating from `vue3-draggable-resizable`](/migration/from-vue3-draggable-resizable).

## Installation

::: code-group

```bash [npm]
npm install vue-drag-resize-kit
```

```bash [pnpm]
pnpm add vue-drag-resize-kit
```

```bash [yarn]
yarn add vue-drag-resize-kit
```

:::

Requires Vue 3.5 or newer. The package is ESM only.

Using Nuxt? See [Nuxt](./ssr#nuxt) for where the stylesheet goes.

## Usage

<DemoFrame><Basic /></DemoFrame>

<<< @/demos/Basic.vue

The element is absolutely positioned, so its parent needs `position: relative` (or any other
non-static position). Import the stylesheet once, anywhere in your app.

An element becomes active when it is pressed, and inactive when the pointer goes down anywhere
outside it. Handles are only shown while it is active.

## Next steps

- [Constraints and handles](./constraints): keep the element inside its parent, set min / max
  sizes, lock axes or the aspect ratio, pick the handles.
- [Models and events](./events): which values are synced and when gestures emit.
- [Snapping](./snapping): align elements to each other and to guides.
- [Flow layout](./flow-layout): resizable images inside rich text.
- [API reference](/api/draggable-resizable): every prop, model, event and slot.
