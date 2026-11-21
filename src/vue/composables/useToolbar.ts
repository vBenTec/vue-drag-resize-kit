import { computed, nextTick, onMounted, shallowRef, watch } from 'vue'

import type { UseToolbarOptions } from '../types'

/** Selector of what the arrow keys move between in the toolbar. */
const TOOLBAR_ITEMS =
  ':is(a[href], button, input, select, textarea, [tabindex], [contenteditable]):not(:disabled, [inert])'

const TOOLBAR_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'Home', 'End'])

const isTextField = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.matches('input, textarea, select') || target.isContentEditable)

/**
 * The index `key` moves to among `count` items, from `index` (`-1` when none is focused): `Home` /
 * `End` to the first / last, `forward` / backward to the next / previous, wrapping around.
 */
const getNextIndex = (key: string, index: number, count: number, forward: boolean) => {
  if (key === 'Home') return 0
  if (key === 'End') return count - 1
  if (forward) return (index + 1) % count
  return index <= 0 ? count - 1 : index - 1
}

/** The top and bottom (viewport px) of what is visible around `el`. */
const getVisibleBlockRange = (el: HTMLElement) => {
  // The nearest ancestor that clips; `body` and `html` hand their overflow to the viewport.
  let node = el.parentElement
  while (node && node !== document.body && getComputedStyle(node).overflowY === 'visible') {
    node = node.parentElement
  }

  const viewport = { top: 0, bottom: document.documentElement.clientHeight }
  if (!node || node === document.body) return viewport
  const paddingTop = node.getBoundingClientRect().top + node.clientTop
  return {
    top: Math.max(viewport.top, paddingTop),
    bottom: Math.min(viewport.bottom, paddingTop + node.clientHeight),
  }
}

/**
 * The `toolbar` slot's placement and keyboard navigation. `auto` is a snapshot, resolved while the
 * toolbar is shown and measurable — after activation and when a gesture has ended (or
 * `updatePlacement()` is called), never in the middle of one or on scroll.
 */
export const useToolbar = ({
  root,
  toolbar,
  active,
  placement: requested,
  gesturing,
  direction,
  focusable,
}: UseToolbarOptions) => {
  // The side `auto` resolved to.
  const autoPlacement = shallowRef<'top' | 'bottom'>('bottom')
  const placement = computed(() => {
    const value = requested()
    return value === 'auto' ? autoPlacement.value : value
  })

  /** Resolves `auto`: below, unless the toolbar does not fit there and there is more room above. */
  const updatePlacement = () => {
    const el = root.value
    const bar = toolbar.value
    if (requested() !== 'auto' || !active.value || !el || !bar) return

    const frame = el.getBoundingClientRect()
    const box = bar.getBoundingClientRect()
    // The gap is the same on either side, so it is measured where the toolbar is now.
    const gap = autoPlacement.value === 'bottom' ? box.top - frame.bottom : frame.top - box.bottom
    const visible = getVisibleBlockRange(el)
    const roomBelow = visible.bottom - frame.bottom
    const roomAbove = frame.top - visible.top
    autoPlacement.value = roomBelow < box.height + gap && roomAbove > roomBelow ? 'top' : 'bottom'
  }

  onMounted(updatePlacement)
  // A tick later: `v-show` only shows the toolbar among the post-flush effects.
  watch([active, requested], () => void nextTick(updatePlacement))
  watch(
    gesturing,
    (running) => {
      if (!running) updatePlacement()
    },
    { flush: 'post' },
  )

  // `preventDefault()` in the slot content opts out of both: `Escape` back to the frame, and the
  // arrow keys moving between the items.
  const onKeydown = (event: KeyboardEvent) => {
    if (event.defaultPrevented) return

    if (event.key === 'Escape') {
      if (!focusable()) return
      root.value?.focus()
      event.preventDefault()
      return
    }

    if (!TOOLBAR_KEYS.has(event.key) || isTextField(event.target)) return
    if (event.altKey || event.ctrlKey || event.metaKey) return
    // Bound on the toolbar. Queried on every key press, so items that come and go are picked up.
    const bar = event.currentTarget as HTMLElement
    const items = [...bar.querySelectorAll<HTMLElement>(TOOLBAR_ITEMS)].filter(
      (item) => item.checkVisibility?.() ?? true,
    )
    if (items.length === 0) return

    const index = items.findIndex((item) => item.contains(event.target as Node))
    // Towards the inline end: `ArrowRight` in LTR, `ArrowLeft` in RTL.
    const forward = event.key === (direction() === 'rtl' ? 'ArrowLeft' : 'ArrowRight')
    items[getNextIndex(event.key, index, items.length, forward)]!.focus()
    event.preventDefault()
  }

  /** Whether `target` is in the toolbar. */
  const contains = (target: EventTarget | null) =>
    target instanceof Node && !!toolbar.value?.contains(target)

  return { placement, updatePlacement, onKeydown, contains }
}
