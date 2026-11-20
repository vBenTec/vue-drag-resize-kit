# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

### Fixed

- A keyboard resize sequence now re-measures the element before its first step, like a pointer
  resize: it syncs a natural size in flow layout first and respects a `boundary` that shrank since
  the last measurement, also where no `ResizeObserver` reported the change.

## 1.3.0 — 2026-11-18

Adds a toolbar slot with `resizeTo` for controls that act on the element, and a documentation
site. One rendering change: with `lockAspectRatio`, the default handles are now the four corners
(see Changed).

### Added

- **`#toolbar` slot** for controls that act on the element (preset sizes, remove, alt text). It
  renders inside the root in a `<div class="vdr-toolbar" role="toolbar">` while the element is
  active, so presses and focus in it count as inside the element — no `@pointerdown.stop`, no
  positioning code. Scoped props: `rect`, `gesture`, `resizeTo` and `deactivate`. Presses in it
  start no gesture and clicks do not activate; the events are not stopped, so listeners on the
  element see them. `ArrowLeft` / `ArrowRight` (mirrored in RTL), `Home` and `End` move focus
  between its items, `Escape` returns focus to the element (with `keyboard`), and focus moves to
  the element when it is deactivated from the toolbar. New props `toolbarLabel` (its
  `aria-label`) and `toolbarPlacement` (`'bottom'` by default, `'top'`, or `'auto'` to flip above
  when there is no room below in the viewport or the nearest clipping ancestor); the side is
  exposed as `data-placement`. New custom property `--vdr-toolbar-offset` (`4px`).
- **`resizeTo(size)`**, as a toolbar slot prop and on the component instance: resizes to
  `{ w }`, `{ h }` or both under the same constraints as a gesture (min / max, `boundary`,
  `parent`, `disabled*`, `lockAspectRatio`) and emits `resize-start`, `resizing` and
  `resize-end` once, so presets are persisted like any other resize. `Infinity` is the maximum
  allowed size, `0` the minimum. Ignored during a gesture.
- `ignoreOutside` prop: a predicate for presses outside the element that must not deactivate it,
  e.g. in teleported content opened from the toolbar.
- Exported types `ToolbarSlotProps`, `ResizeToSize` and `ToolbarPlacement`.
- **Documentation site** at https://vbentec.github.io/vue-drag-resize-kit/, with a live demo on
  every guide page, the full API reference, the migration guides, and `llms.txt` /
  `llms-full.txt` for AI assistants. It is published with every release. The README is now a
  short overview that links into it.

### Changed

- **Corner-only default handles under an aspect lock.** With `lockAspectRatio` in effect (and
  neither `disabledW` nor `disabledH` set), an element without a `handles` prop now renders only
  the four corner handles `tl`, `tr`, `bl`, `br`. Edge handles cannot change one dimension alone
  under the lock, so dragging e.g. `mr` also grew the element downwards. This changes rendering
  for existing `lockAspectRatio` users that don't pass `handles`; pass `handles` to get the edge
  handles back (their corner-mapping behaviour is unchanged). The default follows
  `lockAspectRatio`, `disabledW` and `disabledH` at runtime, and still goes through
  `hideAnchoredHandles`.

## 1.2.0 — 2026-11-18

Everything below is opt-in: without the new props and custom properties, rendering and resizing
are pixel for pixel those of 1.1.0.

### Added

- **Logical handles** `ts` / `te`, `ms` / `me`, `bs` / `be` (inline-start / inline-end), resolved
  against the computed `direction` of the element when it mounts, is activated and a gesture
  starts — so a `dir="auto"` paragraph that turned RTL is picked up. A logical handle renders as
  the physical handle it resolves to (`.vdr-handle-mr`, `data-handle="mr"`); a handle that a
  logical and a physical entry resolve to renders once. `:handles="['te', 'me', 'be']"` gives
  handles that follow the pointer of a flow image in both LTR and RTL text. New exported types
  `PhysicalResizeHandle` and `LogicalResizeHandle`; `ResizeHandle` is now their union.
- `flowAnchor` prop (`'none'` by default, `'start'`, `'end'`, `'center'`, `'auto'`): in flow
  layout, the edge the browser keeps in place. On a centred line the width changes by twice the
  pointer delta, so the dragged handle stays under the pointer; `auto` reads the `direction` and
  `text-align` of the nearest block ancestor. With `hideAnchoredHandles`, the handles on the
  anchored edge are not rendered. Exported as `FlowAnchor`.
- Theming custom properties: `--vdr-border-offset` (frame `outline-offset`; `0` draws the frame
  just outside the content instead of over its outermost pixels), `--vdr-handle-border-width`,
  `--vdr-handle-radius`, `--vdr-handle-shadow` and `--vdr-handle-hit-size` (a pointer target
  larger than the drawn handle, e.g. `24px` for WCAG 2.5.8). Handles stay centred on the frame
  line for any offset and width.
- `keyboard` prop: the element becomes focusable, activates on focus and deactivates on `Escape`
  (`Enter` re-activates). While active, the arrow keys resize the inline-end / bottom edges
  (mirrored in RTL) or move the element (`keyboardMode`, default `move` for a draggable element in
  absolute layout), by `keyboardStep` px (`Shift` × 10), within all constraints; `Home` / `End`
  resize to the min / max width. One key sequence emits one `*-start` / `*-end` pair. Exported as
  `KeyboardMode`.
- With `keyboard`, ARIA semantics: `role="group"`, `aria-roledescription` (`ariaRoleDescription`,
  default `"resizable"`) and a visually hidden, polite live size text (`ariaSizeText`, default
  `"200 × 100"`), updated when a resize ends. Handles now carry `aria-hidden="true"`.
- With `keyboard`, `:focus-visible` draws the frame before activation. In forced colours mode the
  frame and the handles are drawn in system colours (`CanvasText` / `Canvas`) and stay visible.

### Notes

- **`ResizeHandle` is wider.** It now also includes the six logical names. Nothing changes at
  runtime, but TypeScript code that exhaustively `switch`es over a `ResizeHandle` (e.g. with an
  `assertNever` default) needs the new cases or should use `PhysicalResizeHandle`.
- **Handle centring:** while `--vdr-border-offset` is unset, the handles keep their 1.x position,
  half the frame width outside the content edge, although the default frame line is drawn just
  inside it (a 1px mismatch). It is kept on purpose so that existing layouts do not shift; set
  `--vdr-border-offset: calc(-1 * var(--vdr-border-width, 1px))` to centre them exactly on the
  default frame.
- `--vdr-handle-radius` / `--vdr-handle-shadow` apply with zero specificity, so existing consumer
  rules for `border-radius` / `box-shadow` on the handles keep winning.

## 1.1.0 — 2026-11-16

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
[Migrating from `vue3-draggable-resizable`](https://vbentec.github.io/vue-drag-resize-kit/migration/from-vue3-draggable-resizable).

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
