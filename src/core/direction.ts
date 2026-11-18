import type { Direction, PhysicalResizeHandle } from './types'

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

/** A computed `text-align` as the anchor it implies; `justify` and unknown values align to the start. */
const TEXT_ALIGN_ANCHORS: Partial<Record<string, FlowAnchor>> = {
  end: 'end',
  center: 'center',
  '-webkit-center': 'center',
}

const PHYSICAL_TEXT_ALIGNS: Partial<Record<string, AnchoredEdge>> = {
  left: 'left',
  '-webkit-left': 'left',
  right: 'right',
  '-webkit-right': 'right',
}

/**
 * The edge that stays in place for `anchor`, in a block container with the given `direction` and
 * computed `textAlign` (only read for `auto`). `null` for `none`.
 */
export const getAnchoredEdge = (
  anchor: FlowAnchor,
  direction: Direction,
  textAlign = 'start',
): AnchoredEdge | null => {
  if (anchor === 'none') return null
  if (anchor === 'center') return 'center'
  if (anchor === 'auto') {
    const physical = PHYSICAL_TEXT_ALIGNS[textAlign]
    if (physical) return physical
    return getAnchoredEdge(TEXT_ALIGN_ANCHORS[textAlign] ?? 'start', direction)
  }
  return (anchor === 'start') === (direction === 'ltr') ? 'left' : 'right'
}

/** Whether `handle` sits on the anchored edge — a `center` anchor has none. */
export const isOnAnchoredEdge = (handle: PhysicalResizeHandle, edge: AnchoredEdge | null) =>
  (edge === 'left' && handle.charAt(1) === 'l') || (edge === 'right' && handle.charAt(1) === 'r')
