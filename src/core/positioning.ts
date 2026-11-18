import { getMatchedGuides, snapToGuides } from './guides'
import type { ConstraintOptions, Guides, PhysicalResizeHandle, Point, Rect, Size } from './types'

type VerticalEdge = 't' | 'b' | null
type HorizontalEdge = 'l' | 'r' | null

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
  /**
   * Keep the edge opposite to the moving one in place by moving the rect when a `t` / `l` edge
   * is dragged (the default). With `false` the rect never moves: `t` / `l` handles grow the size
   * by the usual delta, and the element extends per its position in the layout — the policy for
   * elements in document flow, whose position the browser owns.
   * @default true
   */
  anchor?: boolean
  /**
   * The left and right edges move symmetrically, as for an element on a centred line in document
   * flow: the width changes by twice the horizontal delta, so the dragged edge follows the
   * pointer. Only meaningful with `anchor: false`.
   * @default false
   */
  symmetric?: boolean
}

/** Edge moved by the first / second letter of a handle; `m`iddle moves neither. */
const VERTICAL_EDGES: Partial<Record<string, VerticalEdge>> = { t: 't', b: 'b' }
const HORIZONTAL_EDGES: Partial<Record<string, HorizontalEdge>> = { l: 'l', r: 'r' }

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max))

interface SizeLimits {
  minWidth: number
  minHeight: number
  maxWidth: number
  maxHeight: number
}

/** Range of positions a rect may take while dragging. */
interface PositionBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

/** The parent to stay inside of, or `null` if the rect may leave it (or its size is unknown). */
const getBounds = (options: ConstraintOptions, parentSize: Size | null) =>
  options.parent ? parentSize : null

/** Min / max size from the options; with `parent`, the size is also capped at the parent's. */
const getSizeLimits = (options: ConstraintOptions, parentSize: Size | null): SizeLimits => {
  const bounds = getBounds(options, parentSize)
  const maxW = options.maxW ?? Infinity
  const maxH = options.maxH ?? Infinity

  return {
    minWidth: options.minW ?? 0,
    minHeight: options.minH ?? 0,
    maxWidth: bounds ? Math.min(bounds.width, maxW) : maxW,
    maxHeight: bounds ? Math.min(bounds.height, maxH) : maxH,
  }
}

/** With `parent`, the positions that keep a rect of the given size inside the parent. */
const getPositionBounds = (
  options: ConstraintOptions,
  parentSize: Size | null,
  { w, h }: Rect,
): PositionBounds => {
  const bounds = getBounds(options, parentSize)

  return bounds
    ? { minX: 0, minY: 0, maxX: bounds.width - w, maxY: bounds.height - h }
    : { minX: -Infinity, minY: -Infinity, maxX: Infinity, maxY: Infinity }
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

/**
 * The position that results from dragging `start` by the given pointer delta: moved, kept inside
 * the parent, snapped to the closest guides and kept inside the parent again, so snapping never
 * pushes the element out. The size does not change while dragging. Disabled axes stay put.
 */
export const dragRect = ({
  start,
  deltaX,
  deltaY,
  options,
  parentSize,
  guides,
}: DragInput): DragResult => {
  const bounds = getPositionBounds(options, parentSize, start)
  const keepInBounds = ({ x, y }: Point): Point => ({
    x: options.disabledX ? x : clamp(x, bounds.minX, bounds.maxX),
    y: options.disabledY ? y : clamp(y, bounds.minY, bounds.maxY),
  })

  const moved = keepInBounds({
    x: options.disabledX ? start.x : start.x + deltaX,
    y: options.disabledY ? start.y : start.y + deltaY,
  })
  if (!guides) return { ...moved, matchedGuides: null }

  const snapped = keepInBounds(
    snapToGuides({ ...start, ...moved }, guides, { x: !options.disabledX, y: !options.disabledY }),
  )
  return { ...snapped, matchedGuides: getMatchedGuides({ ...start, ...snapped }, guides) }
}

/** The aspect ratio (h / w) to preserve, or `null` if it cannot or should not be preserved. */
const getLockedAspectRatio = (start: Rect, options: ConstraintOptions): number | null => {
  if (!options.lockAspectRatio || options.disabledW || options.disabledH) return null
  const ratio = start.h / start.w
  return Number.isFinite(ratio) && ratio > 0 ? ratio : null
}

/**
 * Which edges a handle moves. With a locked aspect ratio both dimensions always change, so an
 * edge handle also moves the adjacent edge: `tm` / `ml` behave like `tl`, `bm` / `mr` like `br`.
 */
export const getResizeEdges = (
  handle: PhysicalResizeHandle,
  options: ConstraintOptions,
  lockAspectRatio = false,
): ResizeEdges => {
  let vertical = VERTICAL_EDGES[handle.charAt(0)] ?? null
  let horizontal = HORIZONTAL_EDGES[handle.charAt(1)] ?? null

  if (lockAspectRatio) {
    if (handle === 'tm' || handle === 'ml') {
      vertical = 't'
      horizontal = 'l'
    } else if (handle === 'bm' || handle === 'mr') {
      vertical = 'b'
      horizontal = 'r'
    }
  }

  return {
    vertical: options.disabledH ? null : vertical,
    horizontal: options.disabledW ? null : horizontal,
  }
}

/**
 * Size limits while resizing: the edges opposite to the moving ones stay where they are, so with
 * `parent` the available room depends on which edges move. With a locked aspect ratio the limits
 * are tightened so that both dimensions reach them at the same time.
 */
const calculateResizeLimits = (
  edges: ResizeEdges,
  start: Rect,
  options: ConstraintOptions,
  parentSize: Size | null,
  aspectRatio: number | null,
) => {
  let { minWidth, minHeight, maxWidth, maxHeight } = getSizeLimits(options, parentSize)

  if (options.parent && parentSize) {
    const roomX = edges.horizontal === 'l' ? start.x + start.w : parentSize.width - start.x
    const roomY = edges.vertical === 't' ? start.y + start.h : parentSize.height - start.y
    maxWidth = Math.min(maxWidth, roomX)
    maxHeight = Math.min(maxHeight, roomY)
  }

  if (aspectRatio !== null) {
    if (minHeight / minWidth > aspectRatio) {
      minWidth = minHeight / aspectRatio
    } else {
      minHeight = minWidth * aspectRatio
    }

    if (maxHeight / maxWidth < aspectRatio) {
      maxWidth = maxHeight / aspectRatio
    } else {
      maxHeight = maxWidth * aspectRatio
    }
  }

  return { minWidth, minHeight, maxWidth, maxHeight }
}

/** How much each dimension grows for a pointer delta. */
const calculateGrowth = (
  handle: PhysicalResizeHandle,
  edges: ResizeEdges,
  deltaX: number,
  deltaY: number,
  aspectRatio: number | null,
) => {
  const growX = edges.horizontal === 'r' ? deltaX : edges.horizontal === 'l' ? -deltaX : 0
  const growY = edges.vertical === 'b' ? deltaY : edges.vertical === 't' ? -deltaY : 0

  if (aspectRatio === null) return { growX, growY }

  // Top / bottom handles are driven by the vertical movement, all others by the horizontal one.
  return handle[1] === 'm'
    ? { growX: growY / aspectRatio, growY }
    : { growX, growY: growX * aspectRatio }
}

export const isSameRect = (a: Rect, b: Rect) =>
  a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h

/** What every resize needs: the ratio to keep, the edges `handle` moves and the size limits. */
const prepareResize = (
  handle: PhysicalResizeHandle,
  start: Rect,
  options: ConstraintOptions,
  parentSize: Size | null,
) => {
  const aspectRatio = getLockedAspectRatio(start, options)
  const edges = getResizeEdges(handle, options, aspectRatio !== null)
  const limits = calculateResizeLimits(edges, start, options, parentSize, aspectRatio)
  return { aspectRatio, edges, limits }
}

type ResizeLimits = ReturnType<typeof calculateResizeLimits>

/** The rect after `edges` grew by `growX` / `growY`, within `limits`. */
const applyGrowth = (
  edges: ResizeEdges,
  start: Rect,
  growX: number,
  growY: number,
  limits: ResizeLimits,
  anchor: boolean | undefined,
): Rect => {
  const w = edges.horizontal ? clamp(start.w + growX, limits.minWidth, limits.maxWidth) : start.w
  const h = edges.vertical ? clamp(start.h + growY, limits.minHeight, limits.maxHeight) : start.h

  return {
    // The edge opposite to the moving one stays in place; without `anchor` the rect never moves.
    x: anchor !== false && edges.horizontal === 'l' ? start.x + start.w - w : start.x,
    y: anchor !== false && edges.vertical === 't' ? start.y + start.h - h : start.y,
    w,
    h,
  }
}

/** The rect that results from dragging `handle` by the given pointer delta. */
export const resizeRect = ({
  handle,
  start,
  deltaX,
  deltaY,
  options,
  parentSize,
  anchor,
  symmetric,
}: ResizeInput): Rect => {
  const { aspectRatio, edges, limits } = prepareResize(handle, start, options, parentSize)
  const { growX, growY } = calculateGrowth(
    handle,
    edges,
    symmetric ? 2 * deltaX : deltaX,
    deltaY,
    aspectRatio,
  )
  return applyGrowth(edges, start, growX, growY, limits, anchor)
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
  /** See {@link ResizeInput.anchor}. @default true */
  anchor?: boolean
}

/**
 * The rect after one keyboard resize step: the edges of `handle` move, the others stay, under the
 * same constraints as a pointer resize from that corner.
 */
export const stepResizeRect = ({
  start,
  growW,
  growH,
  handle,
  options,
  parentSize,
  anchor,
}: StepResizeInput): Rect => {
  const { aspectRatio, edges, limits } = prepareResize(handle, start, options, parentSize)
  // With a locked ratio the stepped dimension drives the other.
  const [growX, growY] =
    aspectRatio === null
      ? [growW, growH]
      : growW !== 0
        ? [growW, growW * aspectRatio]
        : [growH / aspectRatio, growH]
  return applyGrowth(edges, start, growX, growY, limits, anchor)
}
