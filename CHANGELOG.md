# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

### Added

- `layout` prop (`'absolute' | 'flow'`, default `'absolute'`): `flow` keeps the element in
  normal document flow (`position: relative; display: inline-block`) for content such as inline
  editor images. In flow, `x` / `y` are ignored, dragging is inert, `parent` is ignored, and
  resizing never moves the element — `t` / `l` handles grow the size by the usual delta while the
  element extends per its flow position. In a `DraggableContainer`, a flow element is a snap
  target at its laid out position. Exported as `LayoutMode`.
- Natural content sizing in flow layout: a dimension whose model is `0` renders at its content's
  responsive size, which is synced back into `v-model:w` / `v-model:h` (fractional, without
  resize events) and keeps tracking the layout — e.g. through an async image load — until the
  dimension is resized or written from outside. Writing `0` makes it natural again.
- `boundary` prop: cap the size at the content box of any element (CSS selector resolved via
  `closest`, element, ref or getter). Size-only, re-measured when the boundary resizes and when a
  gesture starts; in flow layout only the width is capped. Exported as `BoundaryTarget`.
- A real-browser (Chromium) test project: `pnpm test:browser`, run in CI.

### Changed

> **Check these when upgrading from 1.0.0.** The API is unchanged, but the two changes below
> alter existing behaviour: code that relied on `drag-start` / `resize-start` firing on a plain
> press, or on the selection frame being a border inside the element's size, needs adjusting.

- **Drag / resize events require movement.** `drag-start` / `resize-start` are emitted on the
  first actual pointer movement instead of the press, and `*-end` only after a `*-start`:
  pressing and releasing without moving emits no events and writes no models. The
  `data-dragging` / `data-resizing` attributes still flip on the press.
- **The selection frame is an outline, not a border.** The frame no longer contributes to the
  box model: `w` / `h` now equal the element's true content size, and activation cannot shift
  the content or its neighbours. The `--vdr-border-color` / `--vdr-border-width` properties are
  kept and style the outline; consumer `border: 0` workarounds can be dropped.

## 1.0.0 — 2026-11-14

First release of `vue-drag-resize-kit`, a rewrite of `vue3-draggable-resizable` in
`<script setup>` and TypeScript with working type declarations, a dependency-free ESM build and
a test suite. Changes relative to `vue3-draggable-resizable` 1.6.1 are listed for users
migrating. See
[Migrating from `vue3-draggable-resizable`](README.md#migrating-from-vue3-draggable-resizable).

### Breaking

- **ESM only.** The UMD/CommonJS builds are gone.
- **Named exports only.** There is no default export and no `app.use()` plugin; import
  `DraggableResizable` and `DraggableContainer` by name.
- **Styles moved** to `vue-drag-resize-kit/style.css`.
- **Vue ≥ 3.5** is required and is a peer dependency (it is no longer bundled).
- **Pointer events** replace the separate mouse and touch listeners. Only the primary button
  starts a gesture. Code that relied on `@mousedown.stop` / `@touchstart.stop` to shield an area
  from deactivating an element needs `@pointerdown.stop`.
- **Class names are `vdr-` prefixed.** The `className*` defaults changed from `draggable`,
  `resizable`, `dragging`, `resizing`, `active`, `handle` to `vdr-draggable`, … `vdr-handle`.
  The default theme no longer depends on these classes; it uses the `data-active`,
  `data-dragging` and `data-resizing` attributes.
- **`''` is no longer a valid handle**; the type is now `ResizeHandle`.
- **Event payloads are typed** as `{ x, y }` (drag) and `{ x, y, w, h }` (resize). They were
  declared as DOM `Event`s before.
- **Renamed** the `DraggableContainer` snapping API to one term, _guide_:
  - props: `adsorbParent` → `snapToParent`, `adsorbCols` → `guidesX`, `adsorbRows` → `guidesY`,
    `referenceLineVisible` → `showGuides`, `referenceLineColor` → `guideColor`;
  - classes: `.vdr-reference-line` → `.vdr-guide`, `-col` / `-row` → `.vdr-guide-x` /
    `.vdr-guide-y`.
- `DraggableContainer` renders `.vdr-snap-container`, and `guideColor` has no prop default any
  more — the colour falls back to `--vdr-guide-color`, then `#f00`.
- **No content auto-size.** Without `w` / `h` / `initW` / `initH` the size defaults to `0`; it
  is no longer measured from the content on mount (which also emitted `update:w` / `update:h`).
- **No integer rounding.** x, y, w and h are no longer passed through `Math.floor` and can be
  fractional.
- **`v-model:w` / `v-model:h` win over `initW` / `initH`**, which only apply while the size is not
  controlled. `initW` / `initH` used to override `w` / `h`.

### Added

- `maxW` and `maxH` props.
- Theming through CSS custom properties (`--vdr-border-color`, `--vdr-border-width`,
  `--vdr-handle-size`, `--vdr-handle-background`, `--vdr-handle-border-color`,
  `--vdr-guide-color`).
- `data-active`, `data-dragging`, `data-resizing="<handle>"` and `data-handle="<handle>"`
  attributes for styling and testing.
- Exported types: `DraggableResizableProps`, `DraggableContainerProps`,
  `DraggableResizableEmits`, `DragPayload`, `ResizePayload`, `Rect`, `ResizeHandle`.
- Server-side rendering support (no DOM access during setup).

### Fixed

- The parent's size is observed with a `ResizeObserver` instead of being read once, and is
  measured as the parent's padding box, which is what absolutely positioned children are laid
  out in.
- Snapping can no longer move an element outside its parent.
- A `DraggableContainer` no longer snaps to elements that were unmounted, and follows elements
  that are resized or moved through `v-model`.
- Changing `classNameActive` or `classNameDragging` no longer removes the default styling.
- `lockAspectRatio`, `resizable`, `handles`, `parent` and the `disabled*` props react to changes.

### Changed

- With `lockAspectRatio`, the `tr` and `bl` handles keep the opposite corner in place (they used
  to behave like `br` and `tl`). Top / bottom handles follow the vertical pointer movement.
- Snapping picks the closest guide instead of the last match, and only guides the element is
  actually aligned with are drawn.
- Drag and resize events are emitted synchronously, in order: `*-start`, `*ing`, `*-end`.
- Invalid `handles` entries are ignored instead of failing prop validation.
- No `*-end` event is emitted when an element is unmounted mid-gesture.
