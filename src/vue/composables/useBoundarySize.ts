import { isRef, onWatcherCleanup, shallowRef, watch, type Ref, type ShallowRef } from 'vue'

import type { Size } from '../../core/types'

/**
 * The element whose content box caps the size: a CSS selector matched against the component's
 * ancestors (via `closest`), the element itself, a ref to it, or a getter.
 */
/** A computed padding as a number; happy-dom and friends may report `''` instead of `0px`. */
const padding = (value: string) => parseFloat(value) || 0

export type BoundaryTarget =
  | string
  | HTMLElement
  | Ref<HTMLElement | null>
  | (() => HTMLElement | null)

/**
 * Tracks the content-box size of a `boundary` element — unlike `parent`, which measures the
 * padding box of the immediate parent, this measures any ancestor (or unrelated element) minus
 * its paddings: the room its content actually has. `null` while there is no boundary.
 *
 * The size follows the boundary resizing (`ResizeObserver`) and can be re-measured with
 * `refresh()`, e.g. when a gesture starts.
 */
export const useBoundarySize = (
  root: Readonly<ShallowRef<HTMLElement | null>>,
  boundary: () => BoundaryTarget | undefined,
) => {
  const size = shallowRef<Size | null>(null)

  const resolve = (): HTMLElement | null => {
    const target = boundary()
    if (!target) return null
    if (typeof target === 'string') {
      return root.value?.parentElement?.closest<HTMLElement>(target) ?? null
    }
    if (typeof target === 'function') return target()
    if (isRef(target)) return target.value
    return target
  }

  const measure = (el: HTMLElement | null) => {
    if (!el) {
      size.value = null
      return
    }
    // The content box: the client (padding) box minus the paddings.
    const style = getComputedStyle(el)
    size.value = {
      width: el.clientWidth - padding(style.paddingLeft) - padding(style.paddingRight),
      height: el.clientHeight - padding(style.paddingTop) - padding(style.paddingBottom),
    }
  }

  // `sync` flush: measure during mount, like `useParentSize`. Re-resolves when the component
  // mounts / moves roots, the `boundary` prop changes or a ref / getter target changes.
  watch(
    () => resolve(),
    (el) => {
      measure(el)
      if (!el || typeof ResizeObserver === 'undefined') return

      const observer = new ResizeObserver(() => measure(el))
      observer.observe(el)
      onWatcherCleanup(() => observer.disconnect())
    },
    { immediate: true, flush: 'sync' },
  )

  return {
    /** Content-box size of the boundary, `null` without one. */
    size,
    /** Re-resolve and re-measure right now, e.g. when a gesture starts. */
    refresh: () => measure(resolve()),
  }
}
