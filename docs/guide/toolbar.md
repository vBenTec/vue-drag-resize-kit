<script setup>
import Toolbar from '../demos/Toolbar.vue'
</script>

# Toolbar

Controls that act on the element — preset sizes, "remove", an alt-text field — go into the
`toolbar` slot. It renders inside the element, below it, for as long as the element is active.

<DemoFrame><Toolbar /></DemoFrame>

<<< @/demos/Toolbar.vue

For an "original size" button, pass the image's `naturalWidth`. No `@pointerdown.stop` and no
positioning code: the toolbar is part of the element for outside presses and for focus
(`root.contains(document.activeElement)` holds), but not for gestures, keyboard resizing or
measuring.

| Slot prop    | Type                           | Description                                       |
| ------------ | ------------------------------ | ------------------------------------------------- |
| `rect`       | `Rect`                         | The current rect, live during a gesture.          |
| `gesture`    | `'drag' \| 'resize' \| null`   | The running gesture.                              |
| `resizeTo`   | `(size: ResizeToSize) => void` | Resizes the element; see [`resizeTo`](#resizeto). |
| `deactivate` | `() => void`                   | Sets `active` to `false`.                         |

## Rendering

With the slot, the element renders
`<div class="vdr-toolbar" role="toolbar" data-placement="bottom">` after its content and before
the handles, named by `toolbarLabel` (`aria-label`; there is no default, pass a translation). The
wrapper exists whenever the slot is passed — also if its content renders nothing — and is hidden
with `display: none` while the element is inactive, so state inside it (a half-typed alt text)
survives deactivation. It stays visible during a gesture; hide it there with the `gesture` slot
prop or `.vdr-container[data-resizing] > .vdr-toolbar { visibility: hidden }` if you prefer.

## Events

A press in the toolbar starts no drag, and a click there does not activate the element, so a
button calling `deactivate()` leaves it inactive. The events are not stopped: they still reach
`document` (other elements and other libraries' outside-click handlers keep working) and **your
own listeners on the element** — a `@mousedown.prevent` or `@keydown.enter` on
`<DraggableResizable>` also fires for the toolbar's buttons and inputs; check `event.target`
there.

## Keyboard and focus

Every item stays a Tab stop, in DOM order after the element itself; the library never writes
attributes on your items.

| Key                        | In the toolbar                                                     |
| -------------------------- | ------------------------------------------------------------------ |
| `ArrowRight` / `ArrowLeft` | Focus the next / previous item, wrapping around (mirrored in RTL). |
| `Home` / `End`             | Focus the first / last item.                                       |
| `Escape`                   | With `keyboard`: focus the element, which stays active.            |

The arrow keys, `Home` and `End` are left alone in text fields (`input`, `textarea`, `select`,
contenteditable) and with `Alt`, `Ctrl` or `Meta`. Call `event.preventDefault()` in your own
`keydown` handler to opt out of any of these keys — an alt-text input that cancels itself on
`Escape`, for instance. Keys typed in the toolbar never move or resize the element.

When the element is deactivated while focus is in the toolbar (`deactivate()`, or
`v-model:active` set to `false`), focus moves to the element, which stays inactive — `Enter`
activates it again. This needs `keyboard`; without it the element is not focusable and focus is
left where it was, on a now hidden item. Tabbing out of the toolbar does not deactivate the
element: it stays active until a press outside or `Escape` on the element.

## Placement

`toolbar-placement` is `bottom` (default), `top` or `auto`; the side in use is exposed as
`data-placement="bottom"` / `"top"` on the wrapper. The toolbar is aligned with the inline-start
edge and keeps `--vdr-toolbar-offset` (`4px`) clear of the handles, following the frame's
[custom properties](/api/css#custom-properties). It is as wide as its content, so one that is
wider than the room towards the inline end overflows there.

`auto` places it below, unless the room below is smaller than the toolbar and there is more room
above. Room is measured in the viewport and in the nearest ancestor whose `overflow` is not
`visible` — not in the `boundary`, which only caps the size. It is a snapshot, taken when the
element is activated, when a gesture ends (including `resizeTo`) and when the prop changes; not
while scrolling or when the toolbar's own size changes.

The toolbar is positioned with CSS inside the element, not in the top layer: an ancestor with
`overflow: hidden` clips it when there is no room on either side.

The default look is deliberately plain (`Canvas` background, a `1px` border, `4px` padding,
`z-index: 1`), all at zero specificity: style `.vdr-toolbar` like any other element.

## `resizeTo`

```ts
type ResizeToSize = { w: number; h?: number } | { w?: number; h: number }
```

`resizeTo(size)` resizes the element under the same constraints as a gesture: `minW` / `maxW` /
`minH` / `maxH`, `boundary`, `parent`, `disabledW` / `disabledH` and `lockAspectRatio`. With the
aspect lock the other dimension follows, and `w` wins if both are given. `Infinity` is the
maximum allowed size (nothing happens without a finite one), `-Infinity` or `0` the minimum;
`NaN` is ignored. Like keyboard resizing, the inline-end and bottom edges move; in flow layout
the element never moves.

It emits `resize-start`, `resizing` and `resize-end` once each and writes the models, so presets
are persisted by the same `@resize-end` handler as a drag of a handle. A call that changes
nothing emits nothing. It is ignored during a gesture (pointer or key sequence) and while the
element is not `resizable`.

It is also exposed on the component instance, for controls outside the slot:

```vue
<script setup lang="ts">
import { useTemplateRef } from 'vue'
import { DraggableResizable } from 'vue-drag-resize-kit'

const element = useTemplateRef('element')
</script>

<template>
  <DraggableResizable ref="element" lock-aspect-ratio />
  <button @click="element?.resizeTo({ w: 320 })">Medium</button>
</template>
```

## Teleported content

A select or popover opened from the toolbar is usually teleported to `<body>`, so a press in it
is a press outside the element and deactivates it. `ignoreOutside` is asked about the target of
every press outside the element; return `true` to stay active:

```vue
<DraggableResizable :ignore-outside="(target) => !!target.closest('[data-popover]')" />
```

It works without the toolbar slot too, e.g. for a popover opened from the default slot.
