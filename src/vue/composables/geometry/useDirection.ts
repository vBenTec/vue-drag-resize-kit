import { onMounted, shallowRef, watch } from 'vue'

import { getAnchoredEdge } from '../../../core/handles/direction'
import type { Direction } from '../../../core/types'
import type { UseDirectionOptions } from '../../types'

const toDirection = (style: CSSStyleDeclaration): Direction =>
  style.direction === 'rtl' ? 'rtl' : 'ltr'

/** The computed style of the nearest ancestor that lays out lines (its `text-align` places them). */
const blockAncestorStyle = (el: Element): CSSStyleDeclaration | null => {
  for (let node = el.parentElement; node; node = node.parentElement) {
    const style = getComputedStyle(node)
    if (style.display !== 'inline' && style.display !== 'contents') return style
  }
  return null
}

/**
 * The text direction of the element and, for a flow anchor, the edge the browser keeps in place
 * as it resizes. Read from the computed styles when mounted and on every `refresh()` — when the
 * element is activated or a gesture starts — so a `dir="auto"` paragraph that turned RTL while
 * the element was inactive is picked up without observing it. `ltr` until mounted (and on the
 * server).
 */
export const useDirection = ({ root, flowAnchor }: UseDirectionOptions) => {
  const direction = shallowRef<Direction>('ltr')
  const anchoredEdge = shallowRef(getAnchoredEdge(flowAnchor(), 'ltr'))

  const refresh = () => {
    const el = root.value
    if (!el) return
    direction.value = toDirection(getComputedStyle(el))
    // `text-align` is resolved where the lines are laid out: in the block container.
    const anchor = flowAnchor()
    const block = anchor === 'auto' ? blockAncestorStyle(el) : null
    anchoredEdge.value = block
      ? getAnchoredEdge(anchor, toDirection(block), block.textAlign)
      : getAnchoredEdge(anchor, direction.value)
  }

  onMounted(refresh)
  watch(flowAnchor, refresh)

  return {
    /** The computed `direction` of the element. */
    direction,
    /** The physical edge that stays in place while resizing, `center` for both moving. */
    anchoredEdge,
    /** Re-read the computed styles right now. */
    refresh,
  }
}
