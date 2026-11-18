# TypeScript

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

Every exported type is described in the [types reference](/api/types).
