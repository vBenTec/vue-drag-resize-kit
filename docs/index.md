---
layout: home

hero:
  name: vue-drag-resize-kit
  text: Drag and resize for Vue 3
  tagline: Snapping, alignment guides, document-flow layout, RTL and keyboard support. Fully typed, no runtime dependencies.
  actions:
    - theme: brand
      text: Get started
      link: /guide/getting-started
    - theme: alt
      text: API reference
      link: /api/draggable-resizable
    - theme: alt
      text: View on GitHub
      link: https://github.com/vBenTec/vue-drag-resize-kit

features:
  - title: Drag and resize
    details: Mouse, touch and pen through Pointer Events. Min / max sizes, locked axes and a locked aspect ratio.
    link: /guide/constraints
  - title: Snapping and guides
    details: Elements snap to each other, the parent and custom guides, which are drawn live while dragging.
    link: /guide/snapping
  - title: Document flow
    details: Resizable inline images for rich-text editors, with natural content sizing and a size cap at any boundary element.
    link: /guide/flow-layout
  - title: Right-to-left aware
    details: Logical inline-start / inline-end handles and flow anchoring that follows direction and text alignment.
    link: /guide/rtl
  - title: Accessible
    details: Keyboard resizing and moving, ARIA semantics, forced-colors styles and enlargeable pointer targets.
    link: /guide/accessibility
  - title: Typed, tiny, SSR-safe
    details: Typed props, events and v-models. ESM only, no runtime dependencies, themeable with CSS custom properties.
    link: /guide/typescript
---

<script setup>
import Snapping from './demos/Snapping.vue'
</script>

## Try it

Drag the boxes: they snap to each other, to the edges and centre of the area and to the two
custom guides.

<DemoFrame><Snapping /></DemoFrame>

```bash
npm install vue-drag-resize-kit
```

Continue with [Getting started](/guide/getting-started).
