import type { AnchoredEdge, Direction, FlowAnchor, PhysicalResizeHandle } from '../types'

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

/**
 * The bottom corner on the inline-end edge — `br` in LTR, `bl` in RTL — where keyboard resizing
 * and `resizeTo` change the size.
 */
export const getInlineEndCorner = (direction: Direction) => (direction === 'rtl' ? 'bl' : 'br')
