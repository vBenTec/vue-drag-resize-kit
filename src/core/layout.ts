import type { Layout, LayoutInput } from './types'

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
