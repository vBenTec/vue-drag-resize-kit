# DraggableContainer

Makes the `DraggableResizable` elements inside it snap to each other, to the container's edges and
centre, and to custom guides. See [Snapping](/guide/snapping) for usage.

```ts
import { DraggableContainer } from 'vue-drag-resize-kit'
```

## Props

| Prop           | Type                | Default | Description                                                   |
| -------------- | ------------------- | ------- | ------------------------------------------------------------- |
| `disabled`     | `boolean`           | `false` | Turn snapping off.                                            |
| `snapToParent` | `boolean`           | `true`  | Snap to the edges and the centre of the container.            |
| `guidesX`      | `readonly number[]` | `[]`    | Custom vertical guides (x coordinates in px).                 |
| `guidesY`      | `readonly number[]` | `[]`    | Custom horizontal guides (y coordinates in px).               |
| `showGuides`   | `boolean`           | `true`  | Draw the matching guides while dragging.                      |
| `guideColor`   | `string`            | —       | Guide colour. Falls back to `--vdr-guide-color`, then `#f00`. |

## Slots

| Slot      | Description                                                         |
| --------- | ------------------------------------------------------------------- |
| `default` | The elements. Each `DraggableResizable` inside it is a snap target. |

## Behaviour

- The container fills its parent (`width: 100%; height: 100%; position: relative`).
- An element snaps when one of its edges or its centre comes within 5px of a guide, to the
  closest guide. Snapping applies while dragging, not while resizing.
- Elements with `draggable` off and elements with `layout="flow"` still act as snap targets.
