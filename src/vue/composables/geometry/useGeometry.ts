import type { UseGeometryOptions } from '../../types'
import { useBoundarySize } from './useBoundarySize'
import { useDirection } from './useDirection'
import { useNaturalSize } from './useNaturalSize'
import { useParentSize } from './useParentSize'

/**
 * Everything measured about the element: the size of its parent, the content box of its
 * `boundary`, its natural size in flow layout, its text direction and its flow anchor. Each
 * follows its element where it can (`ResizeObserver`), and `measure()` re-reads them all at once —
 * which a gesture does before it begins, so it never starts from a stale measurement.
 */
export const useGeometry = ({
  root,
  flow,
  flowAnchor,
  boundary,
  measureParent,
  w,
  h,
}: UseGeometryOptions) => {
  const naturalSize = useNaturalSize({ root, enabled: flow, w, h })
  const boundarySize = useBoundarySize(root, boundary)
  const {
    direction,
    anchoredEdge,
    refresh: refreshDirection,
  } = useDirection({
    root,
    flowAnchor: () => (flow() ? flowAnchor() : 'none'),
  })
  const { parentSize, refresh: refreshParentSize } = useParentSize(root, measureParent)

  const measure = () => {
    naturalSize.refresh()
    boundarySize.refresh()
    refreshDirection()
    refreshParentSize()
  }

  return {
    /** Inner size of the parent, `null` while it is not measured. */
    parentSize,
    /** Content-box size of the boundary, `null` without one. */
    boundarySize: boundarySize.size,
    /** Whether the width / height is currently natural (content-sized). */
    naturalW: naturalSize.naturalW,
    naturalH: naturalSize.naturalH,
    /** The computed `direction` of the element. */
    direction,
    /** The physical edge that stays in place while resizing in flow, `center` for both moving. */
    anchoredEdge,
    /** Re-reads every measurement right now. */
    measure,
  }
}
