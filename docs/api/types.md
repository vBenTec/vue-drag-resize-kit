# Types

All types are exported from the package entry:

```ts
import type { DragPayload, ResizeHandle } from 'vue-drag-resize-kit'
```

## Components

| Type                      | Description                                                                                              |
| ------------------------- | -------------------------------------------------------------------------------------------------------- |
| `DraggableResizableProps` | The props of [`DraggableResizable`](./draggable-resizable#props).                                        |
| `DraggableResizableEmits` | The events of [`DraggableResizable`](./draggable-resizable#events), without the `update:*` model events. |
| `ToolbarSlotProps`        | The scoped props of the [`toolbar` slot](/guide/toolbar): `rect`, `gesture`, `resizeTo`, `deactivate`.   |
| `DraggableContainerProps` | The props of [`DraggableContainer`](./draggable-container#props).                                        |

## Payloads

```ts
type DragPayload = { x: number; y: number }
type ResizePayload = { x: number; y: number; w: number; h: number }
type Rect = { x: number; y: number; w: number; h: number }
type ResizeToSize = { w: number; h?: number } | { w?: number; h: number }
```

`ResizeToSize` is the argument of [`resizeTo`](/guide/toolbar#resizeto).

## Handles

```ts
type PhysicalResizeHandle = 'tl' | 'tm' | 'tr' | 'ml' | 'mr' | 'bl' | 'bm' | 'br'
type LogicalResizeHandle = 'ts' | 'te' | 'ms' | 'me' | 'bs' | 'be'
type ResizeHandle = PhysicalResizeHandle | LogicalResizeHandle
```

Physical handles combine a row (`t`op, `m`iddle, `b`ottom) with a column (`l`eft, `m`iddle,
`r`ight). Logical handles name the inline-start (`s`) or inline-end (`e`) side and resolve
against the element's text direction. See [Constraints and handles](/guide/constraints#handles).

## Options

```ts
type LayoutMode = 'absolute' | 'flow'
type FlowAnchor = 'auto' | 'start' | 'end' | 'center' | 'none'
type KeyboardMode = 'move' | 'resize'
type ToolbarPlacement = 'bottom' | 'top' | 'auto'
type BoundaryTarget = string | HTMLElement | Ref<HTMLElement | null> | (() => HTMLElement | null)
```

- `LayoutMode`: see [Flow layout](/guide/flow-layout).
- `FlowAnchor`: see [Right-to-left text](/guide/rtl#flowanchor).
- `KeyboardMode`: see [Accessibility](/guide/accessibility#keyboard).
- `ToolbarPlacement`: see [Toolbar](/guide/toolbar#placement).
- `BoundaryTarget`: see [Boundary](/guide/boundary#targets).
