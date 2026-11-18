---
aside: false
---

# DraggableResizable

The draggable and resizable element. See the [guide](/guide/getting-started) for usage.

```ts
import { DraggableResizable } from 'vue-drag-resize-kit'
```

## Props

All props are optional and reactive.

### Position and size

| Prop       | Type                   | Default      | Description                                                                                |
| ---------- | ---------------------- | ------------ | ------------------------------------------------------------------------------------------ |
| `initW`    | `number`               | `0`          | Initial width in px, used while `w` is not set.                                            |
| `initH`    | `number`               | `0`          | Initial height in px, used while `h` is not set.                                           |
| `layout`   | `'absolute' \| 'flow'` | `'absolute'` | How the element is positioned. See [Flow layout](/guide/flow-layout).                      |
| `parent`   | `boolean`              | `false`      | Restrict movement and size to the parent element. Ignored with `layout="flow"`.            |
| `boundary` | `BoundaryTarget`       | —            | Cap the size at another element's content box. See [the `boundary` prop](/guide/boundary). |
| `minW`     | `number`               | `20`         | Minimum width in px.                                                                       |
| `minH`     | `number`               | `20`         | Minimum height in px.                                                                      |
| `maxW`     | `number`               | —            | Maximum width in px.                                                                       |
| `maxH`     | `number`               | —            | Maximum height in px.                                                                      |

### Behaviour

| Prop              | Type                      | Default         | Description                                                                                                                                                                                                           |
| ----------------- | ------------------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `draggable`       | `boolean`                 | `true`          | Whether the element can be dragged. Ignored with `layout="flow"`.                                                                                                                                                     |
| `resizable`       | `boolean`                 | `true`          | Whether the element can be resized.                                                                                                                                                                                   |
| `disabledX`       | `boolean`                 | `false`         | Lock movement on the x-axis.                                                                                                                                                                                          |
| `disabledY`       | `boolean`                 | `false`         | Lock movement on the y-axis.                                                                                                                                                                                          |
| `disabledW`       | `boolean`                 | `false`         | Lock the width.                                                                                                                                                                                                       |
| `disabledH`       | `boolean`                 | `false`         | Lock the height.                                                                                                                                                                                                      |
| `lockAspectRatio` | `boolean`                 | `false`         | Keep the aspect ratio while resizing; the default handles become the four corners.                                                                                                                                    |
| `handles`         | `readonly ResizeHandle[]` | see description | Handles to render: physical `tl` … `br` or logical `ts` … `be`. Unknown and duplicate entries are ignored. Default: all eight, or the four corners with `lockAspectRatio`. See [Handles](/guide/constraints#handles). |

### Flow layout and direction

| Prop                  | Type         | Default  | Description                                                                  |
| --------------------- | ------------ | -------- | ---------------------------------------------------------------------------- |
| `flowAnchor`          | `FlowAnchor` | `'none'` | Flow layout: the edge that stays put. See [Right-to-left text](/guide/rtl).  |
| `hideAnchoredHandles` | `boolean`    | `false`  | With a resolved `flowAnchor`: don't render the handles on the anchored edge. |

### Keyboard and accessibility

| Prop                  | Type                 | Default         | Description                                                                                    |
| --------------------- | -------------------- | --------------- | ---------------------------------------------------------------------------------------------- |
| `keyboard`            | `boolean`            | `false`         | Keyboard interaction and ARIA semantics. See [Accessibility](/guide/accessibility).            |
| `keyboardStep`        | `number`             | `1`             | Distance of one arrow-key step in px; `Shift` multiplies it by 10.                             |
| `keyboardMode`        | `'move' \| 'resize'` | see description | What the arrow keys do: `move` for a draggable element in absolute layout, `resize` otherwise. |
| `ariaRoleDescription` | `string`             | `'resizable'`   | With `keyboard`: the element's `aria-roledescription`. Pass a translation.                     |
| `ariaSizeText`        | `(w, h) => string`   | `'200 × 100'`   | With `keyboard`: the size text for assistive technology (rounded `w × h` by default).          |

### Class names

| Prop                 | Type     | Default         | Description                                                      |
| -------------------- | -------- | --------------- | ---------------------------------------------------------------- |
| `classNameDraggable` | `string` | `vdr-draggable` | Extra class while `draggable` is on.                             |
| `classNameResizable` | `string` | `vdr-resizable` | Extra class while `resizable` is on.                             |
| `classNameDragging`  | `string` | `vdr-dragging`  | Extra class while dragging.                                      |
| `classNameResizing`  | `string` | `vdr-resizing`  | Extra class while resizing.                                      |
| `classNameActive`    | `string` | `vdr-active`    | Extra class while active.                                        |
| `classNameHandle`    | `string` | `vdr-handle`    | Extra class on every handle, also applied as `<class>-<handle>`. |

## Models

| Model            | Type      | Default | Description                      |
| ---------------- | --------- | ------- | -------------------------------- |
| `v-model:x`      | `number`  | `0`     | Left offset in px.               |
| `v-model:y`      | `number`  | `0`     | Top offset in px.                |
| `v-model:w`      | `number`  | `initW` | Width in px.                     |
| `v-model:h`      | `number`  | `initH` | Height in px.                    |
| `v-model:active` | `boolean` | `false` | Whether the element is selected. |

Every model is optional; without `v-model` the component keeps the value itself. See
[Models and events](/guide/events#models).

## Events

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

A press without movement emits no drag or resize events; see
[Gestures](/guide/events#gestures).

```ts
type DragPayload = { x: number; y: number }
type ResizePayload = { x: number; y: number; w: number; h: number }
```

## Slots

| Slot      | Description            |
| --------- | ---------------------- |
| `default` | The element's content. |

## Attributes

Attributes that are not props, such as `class`, `style`, `aria-label` or `id`, fall through to
the root element. Its state is exposed as `data-*` attributes; see the
[CSS reference](/api/css#selectors).
