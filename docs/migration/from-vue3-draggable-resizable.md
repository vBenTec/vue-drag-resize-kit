# Migrating from vue3-draggable-resizable

`vue-drag-resize-kit` is a rewrite, not a drop-in replacement. The API stays close to
`vue3-draggable-resizable` 1.6.1; these are the differences. Swap the packages first:

```bash
npm uninstall vue3-draggable-resizable
npm install vue-drag-resize-kit
```

**1. Imports.** There is no default export and no plugin any more.

```diff
- import Vue3DraggableResizable, { DraggableContainer } from 'vue3-draggable-resizable'
- import 'vue3-draggable-resizable/dist/Vue3DraggableResizable.css'
- app.use(Vue3DraggableResizable)
+ import { DraggableResizable, DraggableContainer } from 'vue-drag-resize-kit'
+ import 'vue-drag-resize-kit/style.css'
```

Rename `<Vue3DraggableResizable>` to `<DraggableResizable>` in templates, or register it under
the old name yourself: `app.component('Vue3DraggableResizable', DraggableResizable)`.

**2. Environment.** Vue ≥ 3.5 and an ESM-aware toolchain (Vite, Nuxt, webpack 5, …). There is no
UMD or CommonJS build.

**3. Class names.** The defaults of the `className*` props are now prefixed: `draggable` →
`vdr-draggable`, `resizable` → `vdr-resizable`, `dragging` → `vdr-dragging`, `resizing` →
`vdr-resizing`, `active` → `vdr-active`, `handle` → `vdr-handle`. If your CSS targets the old
names, either update the selectors (prefer the `data-*` attributes from [Styling](/api/css#selectors)) or
pass the old names explicitly, for example `class-name-active="active"`.

**4. Pointer events.** Mouse and touch listeners were replaced by Pointer Events. If you used
`@mousedown.stop` / `@touchstart.stop` to keep an element active while clicking elsewhere, use
`@pointerdown.stop`. Only the primary mouse button starts a drag or resize.

**5. Types.** Event handlers receive `{ x, y }` or `{ x, y, w, h }` and are typed that way. The
handle type is `ResizeHandle` and no longer includes `''`.

**6. Snapping props.** The `DraggableContainer` props use one name, _guide_: `adsorbParent` →
`snapToParent`, `adsorbCols` → `guidesX`, `adsorbRows` → `guidesY`, `referenceLineVisible` →
`showGuides`, `referenceLineColor` → `guideColor`. The guides render as `.vdr-guide-x` /
`.vdr-guide-y` (were `.vdr-reference-line-col` / `-row`), coloured by `--vdr-guide-color`.

**7. Behaviour changes.** These may be visible if you depended on the old behaviour:

- With `lockAspectRatio`, the `tr` and `bl` handles keep the opposite corner in place.
- The parent's size is its padding box and follows the parent resizing.
- `DraggableContainer` snaps to the closest guide, never pushes an element out of its parent,
  and only draws guides the element is actually aligned with. `guideColor` can also be set with
  `--vdr-guide-color`.
- **No auto-size.** Without `w` / `h` / `initW` / `initH`, the old component measured its content
  on mount and emitted `update:w` / `update:h`. Now the size defaults to `0`. Pass `init-w` /
  `init-h` or bind `v-model:w` / `v-model:h`.
- **No rounding.** The old component applied `Math.floor` to x, y, w and h. Values can now be
  fractional, for example with `lockAspectRatio` or zoomed pointers. Round in your handler if you
  need integers.
- **`initW` / `initH` priority.** `initW` used to override `w`. Now the `v-model` value wins, and
  `initW` / `initH` only apply while the size is not controlled.
- Unmounting an element during a drag or resize stops the gesture without emitting `drag-end` /
  `resize-end`.

The full list is in the [changelog](/changelog).
