export { default as DraggableContainer } from './vue/components/DraggableContainer.vue'
export { default as DraggableResizable } from './vue/components/DraggableResizable.vue'

export type { Rect, ResizeHandle } from './core/types'
export type { BoundaryTarget } from './vue/composables/useBoundarySize'
export type {
  DraggableContainerProps,
  DraggableResizableEmits,
  DraggableResizableProps,
  DragPayload,
  LayoutMode,
  ResizePayload,
} from './vue/types'
