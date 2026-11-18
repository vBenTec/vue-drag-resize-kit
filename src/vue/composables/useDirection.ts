import { computed, onMounted, shallowRef, watch, type ShallowRef } from 'vue'

import { getAnchoredEdge, type FlowAnchor } from '../../core/direction'
import type { Direction } from '../../core/types'

export interface UseDirectionOptions {
  root: Readonly<ShallowRef<HTMLElement | null>>
  /** The anchor to resolve; `none` outside flow layout. */
  flowAnchor: () => FlowAnchor
}

const readDirection = (el: Element): Direction =>
  getComputedStyle(el).direction === 'rtl' ? 'rtl' : 'ltr'

/** The nearest ancestor that lays out lines (its `text-align` places them), if any. */
const findBlockAncestor = (el: Element): Element | null => {
  for (let node = el.parentElement; node; node = node.parentElement) {
    const { display } = getComputedStyle(node)
    if (display !== 'inline' && display !== 'contents') return node
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
  // Where `text-align` is resolved: the block container's direction and alignment.
  const blockDirection = shallowRef<Direction>('ltr')
  const textAlign = shallowRef('start')

  const refresh = () => {
    const el = root.value
    if (!el) return
    direction.value = readDirection(el)
    if (flowAnchor() !== 'auto') return
    const block = findBlockAncestor(el)
    blockDirection.value = block ? readDirection(block) : direction.value
    textAlign.value = block ? getComputedStyle(block).textAlign : 'start'
  }

  const anchoredEdge = computed(() => {
    const anchor = flowAnchor()
    return anchor === 'auto'
      ? getAnchoredEdge(anchor, blockDirection.value, textAlign.value)
      : getAnchoredEdge(anchor, direction.value)
  })

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
