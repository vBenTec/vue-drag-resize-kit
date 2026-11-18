<p align="center"><img src="docs/logo.png" alt="vue-drag-resize-kit"></p>

<h1 align="center">vue-drag-resize-kit</h1>

<div align="center">

[![npm version](https://img.shields.io/npm/v/vue-drag-resize-kit.svg?style=flat-square)](https://www.npmjs.com/package/vue-drag-resize-kit)
[![license](https://img.shields.io/badge/license-MIT-brightgreen.svg?style=flat-square)](LICENSE)
[![vue](https://img.shields.io/badge/vue-%E2%89%A5%203.5-brightgreen.svg?style=flat-square)](https://vuejs.org)

</div>

> Draggable and resizable component for Vue 3, with snapping, alignment guides and first-class
> TypeScript support.

- Drag and resize with mouse, touch and pen (Pointer Events)
- Restrict movement and size to the parent element, or cap the size at any `boundary` element
- Min / max sizes, locked axes, locked aspect ratio
- Snapping to other elements, the parent and custom guides, drawn live while dragging
- Flow layout for content that stays in the document flow (inline editor images), with natural
  content sizing
- Right-to-left aware: logical (inline-start / inline-end) handles and flow anchoring
- Keyboard resizing and moving, ARIA semantics, forced-colors styles and enlargeable pointer
  targets
- Fully typed props, events and `v-model`s
- No runtime dependencies, ESM, SSR-safe, themeable with CSS custom properties

Originally forked from `vue3-draggable-resizable` and rewritten from scratch. Switching over? See
[Migrating from `vue3-draggable-resizable`](#migrating-from-vue3-draggable-resizable).

## Contents

- [Installation](#installation)
- [Usage](#usage)
- [DraggableResizable](#draggableresizable)
  - [Props](#props)
  - [Models](#models)
  - [Events](#events)
- [Inline images / document flow](#inline-images--document-flow) (`layout="flow"`, `boundary`)
  - [Right-to-left text](#right-to-left-text) (logical handles, `flowAnchor`)
- [DraggableContainer](#draggablecontainer) (snapping)
- [Styling](#styling)
- [Accessibility](#accessibility) (`keyboard`)
- [TypeScript](#typescript)
- [SSR / Nuxt](#ssr--nuxt)
- [Migrating from `vue3-draggable-resizable`](#migrating-from-vue3-draggable-resizable)
- [Development](#development)
- [Credits](#credits)

## Installation

```bash
npm install vue-drag-resize-kit
```

Requires Vue 3.5 or newer. The package is ESM only.

## Usage

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { DraggableResizable, type DragPayload } from 'vue-drag-resize-kit'

import 'vue-drag-resize-kit/style.css'

const x = ref(100)
const y = ref(100)
const w = ref(120)
const h = ref(80)
const active = ref(false)

const onDragEnd = ({ x, y }: DragPayload) => console.log('dropped at', x, y)
</script>

<template>
  <div class="parent">
    <DraggableResizable
      v-model:x="x"
      v-model:y="y"
      v-model:w="w"
      v-model:h="h"
      v-model:active="active"
      parent
      @drag-end="onDragEnd"
    >
      Drag me
    </DraggableResizable>
  </div>
</template>

<style>
.parent {
  position: relative;
  width: 400px;
  height: 300px;
}
</style>
```

The element is absolutely positioned, so its parent needs `position: relative` (or any other
non-static position). Import the stylesheet once, anywhere in your app.

## DraggableResizable

### Props

| Prop                  | Type                      | Default         | Description                                                                                              |
| --------------------- | ------------------------- | --------------- | -------------------------------------------------------------------------------------------------------- |
| `initW`               | `number`                  | `0`             | Initial width in px, used while `w` is not set.                                                          |
| `initH`               | `number`                  | `0`             | Initial height in px, used while `h` is not set.                                                         |
| `layout`              | `'absolute' \| 'flow'`    | `'absolute'`    | How the element is positioned. See [Inline images / document flow](#inline-images--document-flow).       |
| `draggable`           | `boolean`                 | `true`          | Whether the element can be dragged. Ignored with `layout="flow"`.                                        |
| `resizable`           | `boolean`                 | `true`          | Whether the element can be resized.                                                                      |
| `parent`              | `boolean`                 | `false`         | Restrict movement and size to the parent element. Ignored with `layout="flow"`.                          |
| `boundary`            | `BoundaryTarget`          | —               | Cap the size at another element's content box. See [the `boundary` prop](#the-boundary-prop).            |
| `minW`                | `number`                  | `20`            | Minimum width in px.                                                                                     |
| `minH`                | `number`                  | `20`            | Minimum height in px.                                                                                    |
| `maxW`                | `number`                  | —               | Maximum width in px.                                                                                     |
| `maxH`                | `number`                  | —               | Maximum height in px.                                                                                    |
| `disabledX`           | `boolean`                 | `false`         | Lock movement on the x-axis.                                                                             |
| `disabledY`           | `boolean`                 | `false`         | Lock movement on the y-axis.                                                                             |
| `disabledW`           | `boolean`                 | `false`         | Lock the width.                                                                                          |
| `disabledH`           | `boolean`                 | `false`         | Lock the height.                                                                                         |
| `lockAspectRatio`     | `boolean`                 | `false`         | Keep the aspect ratio while resizing.                                                                    |
| `handles`             | `readonly ResizeHandle[]` | all eight       | Handles to render: `tl` … `br`, or logical `ts` … `be` (below). Unknown / duplicate entries are ignored. |
| `flowAnchor`          | `FlowAnchor`              | `'none'`        | Flow layout: the edge that stays put. See [Right-to-left text](#right-to-left-text).                     |
| `hideAnchoredHandles` | `boolean`                 | `false`         | With a resolved `flowAnchor`: don't render the handles on the anchored edge.                             |
| `keyboard`            | `boolean`                 | `false`         | Keyboard interaction and ARIA semantics. See [Accessibility](#accessibility).                            |
| `keyboardStep`        | `number`                  | `1`             | Distance of one arrow-key step in px; `Shift` multiplies it by 10.                                       |
| `keyboardMode`        | `'move' \| 'resize'`      | see description | What the arrow keys do: `move` for a draggable element in absolute layout, `resize` otherwise.           |
| `ariaRoleDescription` | `string`                  | `'resizable'`   | With `keyboard`: the element's `aria-roledescription`. Pass a translation.                               |
| `ariaSizeText`        | `(w, h) => string`        | `'200 × 100'`   | With `keyboard`: the size text for assistive technology (rounded `w × h` by default).                    |
| `classNameDraggable`  | `string`                  | `vdr-draggable` | Extra class while `draggable` is on.                                                                     |
| `classNameResizable`  | `string`                  | `vdr-resizable` | Extra class while `resizable` is on.                                                                     |
| `classNameDragging`   | `string`                  | `vdr-dragging`  | Extra class while dragging.                                                                              |
| `classNameResizing`   | `string`                  | `vdr-resizing`  | Extra class while resizing.                                                                              |
| `classNameActive`     | `string`                  | `vdr-active`    | Extra class while active.                                                                                |
| `classNameHandle`     | `string`                  | `vdr-handle`    | Extra class on every handle, also applied as `<class>-<handle>`.                                         |

All props are reactive.

Handle names combine a row (`t`op, `m`iddle, `b`ottom) with a column (`l`eft, `m`iddle,
`r`ight):

```
tl ─ tm ─ tr
│          │
ml        mr
│          │
bl ─ bm ─ br
```

The logical handles name the inline-start (`s`) or inline-end (`e`) side instead of a physical
one, and resolve against the element's computed `direction`: `me` is `mr` in left-to-right text
and `ml` in right-to-left text, `ts` is `tl` / `tr`, and so on. A logical handle renders as the
physical one it resolves to (`.vdr-handle-mr`, `data-handle="mr"`); if a logical and a physical
entry resolve to the same handle, it renders once. See [Right-to-left text](#right-to-left-text).

With `lockAspectRatio`, corner handles keep the opposite corner in place. Edge handles have to
change both dimensions, so `tm` and `ml` resize from the top-left corner and `bm` and `mr` from
the bottom-right one. The lock is ignored while `disabledW` or `disabledH` is set.

### Models

| Model            | Type      | Default | Description                      |
| ---------------- | --------- | ------- | -------------------------------- |
| `v-model:x`      | `number`  | `0`     | Left offset in px.               |
| `v-model:y`      | `number`  | `0`     | Top offset in px.                |
| `v-model:w`      | `number`  | `initW` | Width in px.                     |
| `v-model:h`      | `number`  | `initH` | Height in px.                    |
| `v-model:active` | `boolean` | `false` | Whether the element is selected. |

Every model is optional. Without `v-model` the component keeps the value itself, so
`<DraggableResizable :x="50" :init-w="100" :init-h="100" />` starts at `x = 50` and can still be
moved.

An element becomes active when it is pressed, and inactive when the pointer goes down anywhere
outside it. Handles are only shown while it is active. To keep an element active while the user
interacts with something else (a toolbar, say), stop the event there:
`<div @pointerdown.stop>`.

### Events

| Event          | Payload         | When                                                        |
| -------------- | --------------- | ----------------------------------------------------------- |
| `activated`    | —               | The element became active.                                  |
| `deactivated`  | —               | The element became inactive.                                |
| `drag-start`   | `DragPayload`   | The pointer first moved after going down on the element.    |
| `dragging`     | `DragPayload`   | On every move while dragging.                               |
| `drag-end`     | `DragPayload`   | The pointer was released or cancelled, after `drag-start`.  |
| `resize-start` | `ResizePayload` | The pointer first moved after going down on a handle.       |
| `resizing`     | `ResizePayload` | On every move while resizing.                               |
| `resize-end`   | `ResizePayload` | The pointer was released or cancelled, after `resize-start` |

A gesture starts with the first actual pointer movement: pressing an element or a handle and
releasing without moving emits no events (and writes no models), so persisting on `*-end` never
fires for a plain click. The `data-dragging` / `data-resizing` attributes still flip on the press,
for visual feedback.

With [`keyboard`](#accessibility), a key sequence is one gesture: the first arrow key that changes
anything emits `*-start`, every step `dragging` / `resizing`, and releasing the last held key (or
losing focus) `*-end` — never one pair per key repeat.

```ts
type DragPayload = { x: number; y: number }
type ResizePayload = { x: number; y: number; w: number; h: number }
```

### Slots

The default slot is the element's content.

## Inline images / document flow

`layout="flow"` keeps the element in normal document flow — the mode for content that belongs to
a text, such as a resizable image in a rich-text editor. The element occupies space, pushes the
following content down as it grows, and never overlaps its surroundings:

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { DraggableResizable, type ResizePayload } from 'vue-drag-resize-kit'

import 'vue-drag-resize-kit/style.css'

const w = ref(0) // 0 = natural: the image renders at its responsive size
const h = ref(0)

const persist = ({ w, h }: ResizePayload) => save({ width: w, height: h })
</script>

<template>
  <div class="editor">
    <p>Some text before the image…</p>
    <DraggableResizable
      layout="flow"
      boundary=".editor"
      lock-aspect-ratio
      v-model:w="w"
      v-model:h="h"
      @resize-end="persist"
    >
      <img src="photo.jpg" style="display: block; width: 100%; height: 100%" />
    </DraggableResizable>
    <p>…and after it.</p>
  </div>
</template>
```

In flow layout:

- The root renders `position: relative; display: inline-block` (via
  `.vdr-container[data-layout='flow']`). `inline-block` is required for natural sizing — the
  element shrinks to fit its content; override it with plain CSS (e.g. `display: block`) if it
  should fill its line instead.
- **The browser owns the position.** `x` / `y` are ignored, dragging is silently inert, and
  resizing never moves the element: `t` / `l` handles grow the size by the usual pointer delta,
  and the element extends per its flow position (in absolute layout they move the element to keep
  the opposite edge in place). All eight handles stay usable; `tr` cannot displace the element
  upwards.
- `parent` is ignored — its measured element is the immediate wrapper, which usually tracks the
  content itself. Use [`boundary`](#the-boundary-prop) to cap the size.
- Give the slotted image `display: block; width: 100%; height: 100%` so it always fills the
  frame — both while natural (the frame shrinks to the image's responsive size) and once sized.
- When the component is not mounted (e.g. the editor shows a plain `<img>` outside of resize
  mode), display the persisted size yourself, responsive constraints included:
  `width: <saved>px; height: auto; max-width: 100%`.

### Natural sizing

In flow layout, a dimension whose model is `0` (the default) is **natural**: it gets no inline
size, the content renders at its responsive size, and the component syncs the rendered
(fractional) size back into `v-model:w` / `v-model:h` — without emitting resize events, so
mounting, selecting or an image finishing to load never looks like a user resize. The element
stays responsive (a natural dimension keeps following the layout, e.g. through an async image
load) until that dimension is actually written from outside the sync:

- the first movement of a resize gesture makes the gestured dimensions explicit, and
- an external write makes a dimension explicit — writing `0` makes it natural again.

Each dimension is tracked separately: `v-model:w="500"` with `h` left at `0` gives a fixed width
and a height that keeps tracking the content. `initW` / `initH` make the size explicit from the
start. Natural sizing is not available in absolute layout, which keeps its documented no-auto-size
contract.

> **Caveat:** a `v-model` handler that transforms the synced value (e.g. rounds it) writes back a
> _different_ value — an external write, which ends naturalness on the spot. Keep the models
> verbatim and persist (round, convert) in your `resize-end` handler instead, which only fires for
> real gestures.

### The `boundary` prop

`boundary` caps the size at the content box of another element — typically the editor column,
table cell or other containing block, which is rarely the immediate parent:

```ts
type BoundaryTarget = string | HTMLElement | Ref<HTMLElement | null> | (() => HTMLElement | null)
```

A string is resolved against the component's ancestors with `closest()`. The cap follows the
boundary resizing (`ResizeObserver`) and is re-measured when a gesture starts, so a boundary that
changed before activation or while active caps the next gesture correctly; constraints are read on
every move, so a cap that changes mid-gesture applies live. The element never moves or shrinks by
itself when the boundary shrinks — the next gesture clamps. `minW` / `minH` win over a smaller
cap. In flow layout only the width is capped (documents grow with their content; with
`lock-aspect-ratio` the width cap bounds the height anyway); in absolute layout both dimensions
are capped.

`boundary` and `parent` differ:

|                | `parent`              | `boundary`                                   |
| -------------- | --------------------- | -------------------------------------------- |
| Element        | the immediate parent  | any element (selector, element, ref, getter) |
| Measures       | the padding box       | the content box (paddings subtracted)        |
| Constrains     | position **and** size | size only                                    |
| In flow layout | ignored               | caps the width                               |

### Right-to-left text

In a rich-text editor, an image sits at the inline-start of its line, so which edge stays put
while it resizes depends on the text direction: the left edge in left-to-right text, the right
edge in right-to-left text. Only the handles on the moving edge follow the pointer. A dragged
handle on the anchored edge cannot move — the size still changes by the pointer delta, but the
opposite edge moves instead.

**Logical handles** pick the moving edge for you. Name the inline-end handles and they render on
the right in LTR and on the left in RTL:

```vue
<DraggableResizable layout="flow" :handles="['te', 'me', 'be']" lock-aspect-ratio />
```

The direction is the computed `direction` of the component's root, so `dir="rtl"`, CSS
`direction` and `dir="auto"` paragraphs (which resolve their direction from their content) all
work. It is read when the element mounts, whenever it is activated and when a gesture starts — a
`dir="auto"` paragraph that turns RTL as the user types is picked up the next time the image is
selected, without observing anything while it is not. Until it mounts (and on the server) the
direction is `ltr`.

**`flowAnchor`** handles text that is not start-aligned. The anchored edge then also depends on
`text-align`: right-aligned text keeps the right edge, and a centred line moves both edges by half
the size change.

| `flowAnchor`       | Anchored edge                                                                                                             |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `'none'` (default) | Not resolved: every handle grows the size by the pointer delta (the 1.1 behaviour).                                       |
| `'start'`          | The inline-start edge (left in LTR, right in RTL).                                                                        |
| `'end'`            | The inline-end edge.                                                                                                      |
| `'center'`         | Neither: both edges move, so the width changes by twice the pointer delta and the dragged handle stays under the pointer. |
| `'auto'`           | Read from the `direction` and `text-align` of the nearest block ancestor (`justify` counts as start).                     |

With `hide-anchored-handles`, the handles on the anchored edge are not rendered, so you can pass
all eight handles and always get only the ones that track the pointer — the right side in LTR, the
left side in RTL, both on a centred line:

```vue
<DraggableResizable layout="flow" flow-anchor="auto" hide-anchored-handles lock-aspect-ratio />
```

`auto` is resolved at the same moments as the direction. `flowAnchor` is ignored in absolute
layout, where resizing from a `t` / `l` handle moves the element to keep the opposite edge in
place.

### Migrating from manual integration overrides

If you integrated `1.0.0` into an editor with consumer-side workarounds, flow layout replaces
them:

- **Drop `position: relative !important; display: inline-block !important`** overrides on
  `.vdr-container` — `layout="flow"` renders exactly that.
- **Drop `border: 0 !important`** — the selection frame is an outline and no longer contributes
  to the box model, so it cannot shrink the content; the dashed frame is back for free.
- **Drop measuring the image before mounting** (`getBoundingClientRect` + passing `w`/`h`) —
  leave the models at `0` and natural sizing seeds them with the displayed size, fractional,
  without fake resize events.
- **Drop computing `max-width` from an ancestor's `clientWidth` minus paddings** — pass the
  ancestor to `boundary` and the component measures its content box itself, live.
- **Restore the `tr` handle** — flow resizing never moves the element, so the upward displacement
  that forced its removal cannot happen.
- **Keep persisting on `resize-end`** — it now only fires for real gestures, never for a
  motionless press.

## DraggableContainer

Wrap elements in a `DraggableContainer` to make them snap to each other, to the parent's edges
and centre, and to custom guides. Matching guides are drawn while dragging.

```vue
<script setup lang="ts">
import { DraggableContainer, DraggableResizable } from 'vue-drag-resize-kit'

import 'vue-drag-resize-kit/style.css'
</script>

<template>
  <div class="parent">
    <DraggableContainer :guides-x="[100, 200]">
      <DraggableResizable :init-w="80" :init-h="80">One</DraggableResizable>
      <DraggableResizable :init-w="80" :init-h="80" :x="150">Two</DraggableResizable>
    </DraggableContainer>
  </div>
</template>
```

The container fills its parent (`width: 100%; height: 100%; position: relative`). Elements snap
when one of their edges or their centre comes within 5px of a guide. Snapping applies while
dragging, not while resizing. Elements with `draggable` off still act as snap targets for the
others, and so do elements with `layout="flow"` — at the position the browser laid them out (their
offset in the nearest positioned ancestor, in whole pixels), not at their ignored `x` / `y`.

| Prop           | Type                | Default | Description                                                   |
| -------------- | ------------------- | ------- | ------------------------------------------------------------- |
| `disabled`     | `boolean`           | `false` | Turn snapping off.                                            |
| `snapToParent` | `boolean`           | `true`  | Snap to the edges and the centre of the container.            |
| `guidesX`      | `readonly number[]` | `[]`    | Custom vertical guides (x coordinates in px).                 |
| `guidesY`      | `readonly number[]` | `[]`    | Custom horizontal guides (y coordinates in px).               |
| `showGuides`   | `boolean`           | `true`  | Draw the matching guides while dragging.                      |
| `guideColor`   | `string`            | —       | Guide colour. Falls back to `--vdr-guide-color`, then `#f00`. |

## Styling

The stylesheet is small and unscoped. Everything is prefixed with `vdr-`:

| Selector                              | Element                                     |
| ------------------------------------- | ------------------------------------------- |
| `.vdr-container`                      | The draggable element.                      |
| `.vdr-container[data-active]`         | … while active.                             |
| `.vdr-container[data-dragging]`       | … while dragging.                           |
| `.vdr-container[data-resizing]`       | … while resizing (the value is the handle). |
| `.vdr-container[data-layout='flow']`  | … with `layout="flow"`.                     |
| `.vdr-container[data-keyboard]`       | … with `keyboard` on.                       |
| `.vdr-handle`, `.vdr-handle-<handle>` | A resize handle (always the physical name). |
| `.vdr-sr-only`                        | The visually hidden size text (`keyboard`). |
| `.vdr-snap-container`                 | The `DraggableContainer` root.              |
| `.vdr-guide`, `.vdr-guide-x`, `-y`    | A guide (`-x` vertical, `-y` horizontal).   |

The selection frame is drawn as an `outline` (dashed while active, solid while dragging), not a
border: it never contributes to the box model, so `w` / `h` always equal the element's true
content size and activating an element cannot shift its content or its neighbours. The historical
`--vdr-border-*` property names are kept and style the outline.

Theme it with CSS custom properties, set on the element or any ancestor:

| Property                    | Default                   | Applies to                                                                   |
| --------------------------- | ------------------------- | ---------------------------------------------------------------------------- |
| `--vdr-border-color`        | `#000`                    | Frame colour.                                                                |
| `--vdr-border-width`        | `1px`                     | Frame width.                                                                 |
| `--vdr-border-offset`       | `-1 * --vdr-border-width` | Frame `outline-offset`: drawn inside the content; `0` draws it just outside. |
| `--vdr-handle-size`         | `7px`                     | Drawn handle size.                                                           |
| `--vdr-handle-background`   | `#f0f0f0`                 | Handle fill.                                                                 |
| `--vdr-handle-border-color` | `#333`                    | Handle border colour.                                                        |
| `--vdr-handle-border-width` | `1px`                     | Handle border width (inside the handle size).                                |
| `--vdr-handle-radius`       | `0`                       | Handle `border-radius`.                                                      |
| `--vdr-handle-shadow`       | `none`                    | Handle `box-shadow`, e.g. a soft ring.                                       |
| `--vdr-handle-hit-size`     | `--vdr-handle-size`       | Pointer target size; larger than the handle adds a transparent margin.       |
| `--vdr-guide-color`         | `#f00`                    | Snapping guides.                                                             |

```css
.editor {
  --vdr-border-color: #4f46e5;
  --vdr-handle-size: 10px;
  --vdr-handle-background: #fff;
  --vdr-handle-border-color: #4f46e5;
}
```

A dashed frame just outside the image and solid handles with a white contrast border, as Gmail
draws them:

```css
.editor {
  --vdr-border-offset: 0; /* dashed line just outside the image */
  --vdr-handle-size: 10px;
  --vdr-handle-background: #4f46e5; /* solid square */
  --vdr-handle-border-color: #fff; /* white contrast border */
  --vdr-handle-border-width: 2px;
  --vdr-handle-hit-size: 24px; /* see Accessibility */
}
```

The handles are centred on the frame line (whose centre is `--vdr-border-offset +
--vdr-border-width / 2` outside the content edge), whatever the offset, width and handle border.
While `--vdr-border-offset` is unset they keep their 1.x position, half the frame width
_outside_ the edge, although the default frame line is drawn just _inside_ it — a 1px mismatch
kept so that existing layouts render pixel for pixel as before. Set the default explicitly to
centre them exactly: `--vdr-border-offset: calc(-1 * var(--vdr-border-width, 1px))`.

`--vdr-handle-radius` and `--vdr-handle-shadow` are applied with zero specificity, so a rule of
your own that sets `border-radius` or `box-shadow` on the handles keeps winning.

The `className*` props add classes on top of these, which is handy with utility CSS:

```vue
<DraggableResizable class-name-active="ring-2" class-name-handle="my-handle" />
<!-- handles render as: class="vdr-handle vdr-handle-tl my-handle my-handle-tl" -->
```

The component sets `touch-action: none` on itself so that touch gestures drag the element
instead of scrolling the page.

With `keyboard`, the frame is also drawn while the element has keyboard focus
(`.vdr-container[data-keyboard]:focus-visible`), before it is activated. In forced colours mode
(`@media (forced-colors: active)`, e.g. Windows high contrast) the frame is drawn in `CanvasText`
and the handles in `Canvas` with a `CanvasText` border, so they stay visible whatever the custom
properties say.

## Accessibility

The component aims to never stand in the way of meeting WCAG 2.2 AA. It covers what it can on
its own; some parts — labels, translations and a non-dragging way to resize — only the app can
provide.

**Keyboard.** Turn it on with the `keyboard` prop:

```vue
<DraggableResizable
  layout="flow"
  keyboard
  :aria-label="t('Image')"
  :aria-role-description="t('resizable image')"
  :aria-size-text="(w, h) => t('%s by %s pixels', Math.round(w), Math.round(h))"
/>
```

| Key                   | Action                                                                                           |
| --------------------- | ------------------------------------------------------------------------------------------------ |
| `Tab`                 | Focuses the element, which activates it (`v-model:active`).                                      |
| `Escape`              | Deactivates it; focus stays on it.                                                               |
| `Enter`               | Activates it again.                                                                              |
| `ArrowRight` / `Left` | Resize: grows / shrinks the width at the inline-end edge (mirrored in RTL: `ArrowLeft` grows).   |
| `ArrowDown` / `Up`    | Resize: grows / shrinks the height at the bottom edge.                                           |
| `Home` / `End`        | Resize: width to its minimum / to its maximum (`maxW`, `boundary`, `parent`), when there is one. |
| arrows                | Move (`keyboardMode="move"`): by the step, physically.                                           |
| `Shift` + arrows      | Ten steps at once.                                                                               |

One step is `keyboardStep` px (default `1`). Every constraint applies, as for a pointer gesture:
min / max sizes, `boundary`, `parent`, `lockAspectRatio` (the other dimension follows) and the
`disabled*` props. Arrow keys of an inactive element, keys with `Ctrl`, `Meta` or `Alt`, and keys
typed into focusable content inside the element are left alone. A draggable element in absolute
layout moves by default; set `keyboard-mode="resize"` to resize it instead. Events follow the
[gesture rules](#events): one `*-start` / `*-end` pair per key sequence.

**Semantics.** With `keyboard`, the root gets `tabindex="0"`, `role="group"`,
`aria-roledescription` (from `ariaRoleDescription`, default `"resizable"`) and an
`aria-describedby` pointing at a visually hidden, polite live text with the current size (from
`ariaSizeText`, default `"200 × 100"`). The size text is updated when a resize ends, never mid
gesture. `aria-label` / `aria-labelledby` and any other attributes fall through to the root, so
name the element there. The handles are pointer affordances only: they carry `aria-hidden="true"`
and are never focusable. Without `keyboard`, nothing but the handles' `aria-hidden` is added.

**Pointer targets (WCAG 2.5.8).** The default handles are 7px squares. Set
`--vdr-handle-hit-size: 24px` to give each one a 24 × 24 pointer target without changing what is
drawn.

**Dragging movements (WCAG 2.5.7).** Resizing with the handles is a dragging movement, and the
keyboard is not a single-pointer alternative. Offer one in your UI — for example preset sizes,
written to `v-model:w` / `v-model:h`:

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { DraggableResizable } from 'vue-drag-resize-kit'

const w = ref(0)
const h = ref(0)
// Scales the height along, like `lock-aspect-ratio` does.
const resizeTo = (width: number) => {
  h.value = (h.value * width) / w.value
  w.value = width
}
</script>

<template>
  <DraggableResizable layout="flow" lock-aspect-ratio keyboard v-model:w="w" v-model:h="h">
    <img src="photo.jpg" alt="…" style="display: block; width: 100%; height: 100%" />
  </DraggableResizable>
  <div role="toolbar" aria-label="Image size" @pointerdown.stop>
    <button @click="resizeTo(160)">Small</button>
    <button @click="resizeTo(320)">Medium</button>
    <button @click="resizeTo(640)">Large</button>
  </div>
</template>
```

`@pointerdown.stop` keeps the element active while the toolbar is used. Writes to the models do
not emit resize events: persist there as well, or from a `watch`.

## TypeScript

Types ship with the package. Props, models and event payloads are checked in templates (with
Vue - Official / `vue-tsc`).

```ts
import type {
  DraggableResizableProps,
  DraggableContainerProps,
  DraggableResizableEmits,
  DragPayload, // { x, y }
  ResizePayload, // { x, y, w, h }
  Rect, // { x, y, w, h }
  ResizeHandle, // PhysicalResizeHandle | LogicalResizeHandle
  PhysicalResizeHandle, // 'tl' | 'tm' | 'tr' | 'ml' | 'mr' | 'bl' | 'bm' | 'br'
  LogicalResizeHandle, // 'ts' | 'te' | 'ms' | 'me' | 'bs' | 'be'
  LayoutMode, // 'absolute' | 'flow'
  FlowAnchor, // 'auto' | 'start' | 'end' | 'center' | 'none'
  KeyboardMode, // 'move' | 'resize'
  BoundaryTarget, // string | HTMLElement | Ref<HTMLElement | null> | (() => HTMLElement | null)
} from 'vue-drag-resize-kit'

const handles: ResizeHandle[] = ['tl', 'br', 'me']
```

## SSR / Nuxt

The components render on the server and attach their listeners after mounting, so no
`<ClientOnly>` wrapper is needed. Positions come from props, so the server output already has
the right layout.

## Migrating from `vue3-draggable-resizable`

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
names, either update the selectors (prefer the `data-*` attributes from [Styling](#styling)) or
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

The full list is in the [changelog](CHANGELOG.md).

## Development

```bash
pnpm install
pnpm dev-vue     # playground
pnpm test        # unit, component and type tests (happy-dom)
pnpm exec playwright install chromium
pnpm test:browser # real-browser tests (Chromium)
pnpm typecheck
pnpm lint && pnpm fmt:check
pnpm build && pnpm check:pkg
```

`src/core` holds the framework-agnostic geometry (limits, resizing, snapping); `src/vue` holds
the components and composables built on it. Only `src/index.ts` is public API.

See [RELEASE.md](RELEASE.md) for how to cut a release.

## Credits

Originally forked from
[a7650/vue3-draggable-resizable](https://github.com/a7650/vue3-draggable-resizable) by ZZP. The
current code base is a full rewrite.

## License

[MIT](LICENSE)
