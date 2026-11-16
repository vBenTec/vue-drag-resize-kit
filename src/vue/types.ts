import type { EmitFn, ShortEmitsToObject } from 'vue'

import type { Guides, Point, Rect, ResizeHandle, Size } from '../core/types'
import type { BoundaryTarget } from './composables/useBoundarySize'

/**
 * How the element is positioned.
 *
 * - `absolute` (the default): the element is absolutely positioned at `x` / `y` and can be
 *   dragged; resizing from a `t` / `l` edge moves it to keep the opposite edge in place.
 * - `flow`: the element stays in normal document flow (`position: relative; display:
 *   inline-block`) — the layout for content such as inline images in an editor. The browser owns
 *   the position: `x` / `y` are ignored, dragging is inert and resizing never moves the element —
 *   `t` / `l` handles grow the size by the usual delta and the element extends per its flow
 *   position. A dimension whose model is `0` is *natural*: it gets no inline size, renders at its
 *   content's responsive size and syncs that size back to the model. `parent` is ignored (its
 *   measured wrapper is usually sized by the content itself); use `boundary` instead.
 */
export type LayoutMode = 'absolute' | 'flow'

export interface DraggableResizableProps {
  /** Initial width (px), used when `w` / `v-model:w` is not set. */
  initW?: number
  /** Initial height (px), used when `h` / `v-model:h` is not set. */
  initH?: number
  /** How the element is positioned; see {@link LayoutMode}. @default 'absolute' */
  layout?: LayoutMode
  /** Whether the element can be dragged. Ignored with `layout="flow"`. @default true */
  draggable?: boolean
  /** Whether the element can be resized. @default true */
  resizable?: boolean
  /** Lock movement on the x-axis. */
  disabledX?: boolean
  /** Lock movement on the y-axis. */
  disabledY?: boolean
  /** Lock the width. */
  disabledW?: boolean
  /** Lock the height. */
  disabledH?: boolean
  /** Minimum width (px). @default 20 */
  minW?: number
  /** Minimum height (px). @default 20 */
  minH?: number
  /** Maximum width (px). @default Infinity */
  maxW?: number
  /** Maximum height (px). @default Infinity */
  maxH?: number
  /** Restrict movement and size to the parent element. Ignored with `layout="flow"`. */
  parent?: boolean
  /**
   * Cap the size at the content box of another element (any ancestor, or an unrelated element):
   * a CSS selector matched against the ancestors via `closest`, the element, a ref, or a getter.
   * Size-only — unlike `parent` it never constrains the position. The width cap always applies;
   * the height cap only in absolute layout (in flow, documents grow with their content).
   * Re-measured when the boundary resizes and when a gesture starts; the element never moves or
   * shrinks by itself when the boundary shrinks. `minW` / `minH` win over a smaller cap.
   */
  boundary?: BoundaryTarget
  /** Resize handles to render. @default all eight handles */
  handles?: readonly ResizeHandle[]
  /** Keep the aspect ratio while resizing. */
  lockAspectRatio?: boolean
  /** Additional class while `draggable` is enabled. @default 'vdr-draggable' */
  classNameDraggable?: string
  /** Additional class while `resizable` is enabled. @default 'vdr-resizable' */
  classNameResizable?: string
  /** Additional class while dragging. @default 'vdr-dragging' */
  classNameDragging?: string
  /** Additional class while resizing. @default 'vdr-resizing' */
  classNameResizing?: string
  /** Additional class while active. @default 'vdr-active' */
  classNameActive?: string
  /** Additional class for each handle; also applied as `<class>-<handle>`. @default 'vdr-handle' */
  classNameHandle?: string
}

export interface DraggableContainerProps {
  /** Turn snapping off. */
  disabled?: boolean
  /** Snap to the edges and the centre of the parent. @default true */
  snapToParent?: boolean
  /** Custom vertical guides (x coordinates, px). */
  guidesX?: readonly number[]
  /** Custom horizontal guides (y coordinates, px). */
  guidesY?: readonly number[]
  /** Show the matching guides while dragging. @default true */
  showGuides?: boolean
  /** Colour of the guides. Defaults to `--vdr-guide-color`, then `#f00`. */
  guideColor?: string
}

/** Payload of `drag-start`, `dragging` and `drag-end`. */
export type DragPayload = Point

/** Payload of `resize-start`, `resizing` and `resize-end`. */
export type ResizePayload = Rect

export type DraggableResizableEmits = {
  activated: []
  deactivated: []
  'drag-start': [payload: DragPayload]
  dragging: [payload: DragPayload]
  'drag-end': [payload: DragPayload]
  'resize-start': [payload: ResizePayload]
  resizing: [payload: ResizePayload]
  'resize-end': [payload: ResizePayload]
}

/** @internal Type of the component's `emit` function, for the composables. */
export type DraggableResizableEmit = EmitFn<ShortEmitsToObject<DraggableResizableEmits>>

/** @internal What a `DraggableContainer` provides to the elements inside it. */
export interface ContainerContext {
  /**
   * Registers an element as a snap target until the calling scope is disposed. Call it during
   * setup; `getRect` is only read when another member starts a drag.
   */
  join: (getRect: () => Rect) => ContainerMember
}

/** @internal An element registered with a container. */
export interface ContainerMember {
  /** Starts snapping a drag of this member to the guides of the container and the others. */
  startSnap: (parentSize: Size | null) => SnapSession
}

/**
 * @internal One drag's access to the container's guides. Only the most recently started session
 * that has not ended can publish; it ends with the drag, when its member starts another drag or
 * when its member leaves the container.
 */
export interface SnapSession {
  /** Guides to snap to, `null` while snapping is disabled. */
  readonly guides: Guides | null
  /** Shows the guides the element is aligned with. */
  publish: (matched: Guides | null) => void
  /** Hides the matched guides. */
  end: () => void
}
