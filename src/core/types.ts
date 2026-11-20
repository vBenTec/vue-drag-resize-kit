/** A handle at a fixed side: `t`op / `m`iddle / `b`ottom + `l`eft / `m`iddle / `r`ight. */
export type PhysicalResizeHandle = 'tl' | 'tm' | 'tr' | 'ml' | 'mr' | 'bl' | 'bm' | 'br'

/**
 * A handle on the inline-`s`tart / inline-`e`nd side (`t`op / `m`iddle / `b`ottom + `s` / `e`),
 * resolved against the text direction: `ms` is `ml` in LTR and `mr` in RTL.
 */
export type LogicalResizeHandle = 'ts' | 'te' | 'ms' | 'me' | 'bs' | 'be'

/** Identifier of a resize handle, physical or logical. */
export type ResizeHandle = PhysicalResizeHandle | LogicalResizeHandle

/** Text direction, as the computed `direction` of an element. */
export type Direction = 'ltr' | 'rtl'

/**
 * How a resize moves the rect:
 *
 * - `anchored`: the edge opposite to the moving one stays in place, so the rect moves when a
 *   `t` / `l` edge is dragged (absolute layout).
 * - `grow`: the rect never moves; `t` / `l` handles grow the size by the usual delta and the
 *   element extends per its position in the layout (flow layout, whose position the browser owns).
 * - `symmetric`: like `grow`, but the left and right edges move symmetrically, as for an element
 *   on a centred line: the width changes by twice the horizontal delta, so the dragged edge follows
 *   the pointer.
 */
export type ResizeMode = 'anchored' | 'grow' | 'symmetric'

export interface Point {
  x: number
  y: number
}

export interface Size {
  width: number
  height: number
}

/** Position and size of an element, in px relative to its offset parent. */
export interface Rect extends Point {
  w: number
  h: number
}

/** Everything that restricts how an element may be moved or resized. */
export interface ConstraintOptions {
  disabledX?: boolean
  disabledY?: boolean
  disabledW?: boolean
  disabledH?: boolean
  minW?: number
  minH?: number
  maxW?: number
  maxH?: number
  /** Keep the element inside its parent. */
  parent?: boolean
  lockAspectRatio?: boolean
}

export interface SnapOptions {
  disabled?: boolean
  /** Snap to the edges and the centre of the parent. */
  snapToParent?: boolean
  /** Custom vertical guides (x coordinates). */
  guidesX?: readonly number[]
  /** Custom horizontal guides (y coordinates). */
  guidesY?: readonly number[]
}

/** Coordinates an element can snap to: vertical guides on `x`, horizontal guides on `y`. */
export interface Guides {
  x: number[]
  y: number[]
}

/**
 * Which edge of an element in document flow stays in place while it resizes:
 *
 * - `none`: not resolved — every handle grows the size by the usual pointer delta.
 * - `start` / `end`: the inline-start / inline-end edge (left / right, mirrored in RTL).
 * - `center`: neither, the element is on a centred line and both edges move.
 * - `auto`: read from the `direction` and `text-align` of the nearest block ancestor.
 */
export type FlowAnchor = 'auto' | 'start' | 'end' | 'center' | 'none'

/** The resolved anchor: the physical edge that stays in place, or `center` for both moving. */
export type AnchoredEdge = 'left' | 'right' | 'center'

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

export interface LayoutInput {
  layout: LayoutMode
  draggable: boolean
  /** The constraints from the props. */
  constraints: ConstraintOptions
  /** Content-box size of the `boundary`, `null` without one. */
  boundary: Size | null
  /** The resolved flow anchor, `null` for none. */
  anchoredEdge: AnchoredEdge | null
}

/** What the layout mode makes of the props. */
export interface Layout {
  /** Whether the element sits at `x` / `y`; in flow the browser owns the position. */
  positioned: boolean
  /** Whether the element can be dragged; in flow dragging is inert. */
  draggable: boolean
  /** The effective constraints, with the boundary folded into the max size. */
  constraints: ConstraintOptions
  /** How a resize moves the rect. */
  resizeMode: ResizeMode
}

/** The gesture an element is performing: a drag, or a resize by one of its handles. */
export type Gesture = { kind: 'drag' } | { kind: 'resize'; handle: PhysicalResizeHandle }

/** Where in its gesture an event is: `start`, every `move`, and `end`. */
export type GesturePhase = 'start' | 'move' | 'end'

export interface GestureHost {
  /** Re-measures the element; runs before a gesture reads the rect it begins with. */
  measure: () => void
  /** The element's current rect. */
  read: () => Rect
  /** Moves or resizes the element. */
  write: (rect: Rect) => void
  /** Reports a phase of `gesture` with the rect it carries. */
  emit: (phase: GesturePhase, gesture: Gesture, rect: Rect) => void
  /** Called with the running gesture whenever it changes, `null` once none runs. */
  onChange: (gesture: Gesture | null) => void
}

/** A pointer gesture in progress. */
export interface PointerGesture {
  /** The rect the gesture began with, measured at the press. */
  start: Rect
  /** Applies the rect of a pointer movement; the first one emits `start`. */
  move: (next: Rect) => void
  /** Ends the gesture on release; `end` only follows a `start`. */
  end: () => void
}

/** Computes the rect after a step from the current one, `null` if the step changes nothing. */
export type StepTarget = (current: Rect) => Rect | null

/** The top or bottom edge, `null` for neither. */
export type VerticalEdge = 't' | 'b' | null

/** The left or right edge, `null` for neither. */
export type HorizontalEdge = 'l' | 'r' | null

export interface ResizeEdges {
  /** Edge that follows the pointer vertically, `null` if the height does not change. */
  vertical: VerticalEdge
  /** Edge that follows the pointer horizontally, `null` if the width does not change. */
  horizontal: HorizontalEdge
}

export interface ResizeInput {
  handle: PhysicalResizeHandle
  /** Rect at the moment the resize started. */
  start: Rect
  /** Pointer movement since the resize started. */
  deltaX: number
  deltaY: number
  options: ConstraintOptions
  /** Size of the parent, required for `options.parent`. */
  parentSize: Size | null
  /** See {@link ResizeMode}. @default 'anchored' */
  mode?: ResizeMode
}

export interface DragInput {
  /** Rect at the moment the drag started. */
  start: Rect
  /** Pointer movement since the drag started. */
  deltaX: number
  deltaY: number
  options: ConstraintOptions
  /** Size of the parent, required for `options.parent`. */
  parentSize: Size | null
  /** Guides to snap to, `null` to not snap. */
  guides: Guides | null
}

export interface DragResult extends Point {
  /** Guides the element is aligned with at the new position, `null` without guides. */
  matchedGuides: Guides | null
}

export interface StepResizeInput {
  /** Rect before the step. */
  start: Rect
  /**
   * How much the width / the height should grow (negative to shrink), one of them `0`. With a
   * locked aspect ratio the other dimension follows. `±Infinity` resizes to the min / max size.
   */
  growW: number
  growH: number
  /** The bottom corner whose edges move: `br` grows the width to the right, `bl` to the left. */
  handle: 'bl' | 'br'
  options: ConstraintOptions
  /** Size of the parent, required for `options.parent`. */
  parentSize: Size | null
  /**
   * See {@link ResizeMode}. A step changes the size by exactly its amount, so `symmetric` steps
   * like `grow`. @default 'anchored'
   */
  mode?: ResizeMode
}

export interface ResizeToInput extends Omit<StepResizeInput, 'growW' | 'growH'> {
  /**
   * The size to resize to. `±Infinity` is the max / min size; a missing or `NaN` dimension stays.
   */
  size: { w?: number; h?: number }
}

export interface PointerSessionHandlers {
  /** Called on every move with the distance travelled since the session started. */
  onMove: (deltaX: number, deltaY: number, event: PointerEvent) => void
  /** Called once when the pointer is released or the gesture is cancelled. */
  onEnd: () => void
}
