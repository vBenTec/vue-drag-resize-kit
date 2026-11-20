import type { AnchoredEdge } from './direction'
import type { ConstraintOptions, ResizeMode, Size } from './types'

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

/**
 * Resolves the props under a layout mode. In flow the browser owns the position: dragging is
 * inert, `parent` is ignored (it measures the immediate wrapper and reads `x` / `y`), the boundary
 * caps only the width (documents grow with their content; an aspect lock still bounds the height
 * through the width), and a resize never moves the rect.
 */
export const resolveLayout = ({
  layout,
  draggable,
  constraints,
  boundary,
  anchoredEdge,
}: LayoutInput): Layout => {
  const flow = layout === 'flow'
  const { maxW, maxH } = constraints

  return {
    positioned: !flow,
    draggable: draggable && !flow,
    constraints: {
      ...constraints,
      maxW: boundary ? Math.min(maxW ?? Infinity, boundary.width) : maxW,
      maxH: boundary && !flow ? Math.min(maxH ?? Infinity, boundary.height) : maxH,
      parent: flow ? false : constraints.parent,
    },
    resizeMode: !flow ? 'anchored' : anchoredEdge === 'center' ? 'symmetric' : 'grow',
  }
}
