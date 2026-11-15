import { onWatcherCleanup, readonly, shallowRef, watch, type Ref, type ShallowRef } from 'vue'

import type { Size } from '../../core/types'

export interface UseNaturalSizeOptions {
  root: Readonly<ShallowRef<HTMLElement | null>>
  /** Natural sizing only applies in flow layout. */
  enabled: () => boolean
  w: Ref<number>
  h: Ref<number>
}

/** Whether a model write turns its dimension natural / explicit; `null` for a synced echo. */
const classify = (value: number, lastSynced: number | null): boolean | null =>
  value === 0 ? true : value === lastSynced ? null : false

/**
 * Natural content sizing for flow layout: a dimension whose model is `0` is *natural* — it gets
 * no inline size, the content renders at its responsive size, and the rendered size is synced
 * back into the model (fractional, without resize events) whenever the element resizes, e.g.
 * when an image finishes loading.
 *
 * The sync's own writes never end naturalness: a dimension becomes *explicit* only when its
 * model changes from elsewhere — the first gesture movement, or an external parent write. An
 * external write of `0` makes it natural again. Explicit dimensions are left alone.
 */
export const useNaturalSize = ({ root, enabled, w, h }: UseNaturalSizeOptions) => {
  const naturalW = shallowRef(w.value === 0)
  const naturalH = shallowRef(h.value === 0)

  // Sync writes happen inside this bracket, so the model watcher below can tell them apart from
  // gesture or parent writes. `lastSynced*` catches the async echo of a controlled model: the
  // parent writing back the exact synced value keeps the dimension natural (a *rounding* handler
  // does not — its value differs, which is why persisting belongs on `resize-end` instead).
  let syncing = false
  let lastSyncedW: number | null = null
  let lastSyncedH: number | null = null

  /**
   * The rendered size in the terms of the inline `width` / `height`: their resolved values are the
   * used border box (see styles) — fractional, in layout px (unlike a bounding rect, untouched by
   * transforms) and physical in any writing mode. `null` while not rendered (they resolve `auto`).
   */
  const measureRoot = (): Size | null => {
    const el = root.value
    if (!el) return null
    const style = getComputedStyle(el)
    const width = parseFloat(style.width)
    const height = parseFloat(style.height)
    return Number.isNaN(width) || Number.isNaN(height) ? null : { width, height }
  }

  /** Writes the rendered size into the natural models. */
  const sync = () => {
    if (!enabled() || (!naturalW.value && !naturalH.value)) return
    const measured = measureRoot()
    if (!measured) return

    syncing = true
    try {
      if (naturalW.value) {
        lastSyncedW = measured.width
        if (w.value !== measured.width) w.value = measured.width
      }
      if (naturalH.value) {
        lastSyncedH = measured.height
        if (h.value !== measured.height) h.value = measured.height
      }
    } finally {
      syncing = false
    }
  }

  // `sync`: gesture writes land through the models mid-task, so the bracket must be observed
  // synchronously to be meaningful.
  watch(
    [w, h],
    ([newW, newH], [oldW, oldH]) => {
      if (syncing) return
      const nextW = newW === oldW ? null : classify(newW, lastSyncedW)
      const nextH = newH === oldH ? null : classify(newH, lastSyncedH)
      if (nextW !== null) naturalW.value = nextW
      if (nextH !== null) naturalH.value = nextH
    },
    { flush: 'sync' },
  )

  // A dimension that turns natural (or natural sizing that turns on) picks up the rendered size
  // right away — after the re-render: before it, the element still has its old inline size or
  // absolute layout, which a measurement would read back into the model.
  watch(
    [enabled, naturalW, naturalH],
    (next, prev) => {
      if (next.some((on, index) => on && !prev[index])) sync()
    },
    { flush: 'post' },
  )

  // `sync` flush: observe during mount, like `useParentSize`. Without a `ResizeObserver` the
  // one-shot measure (plus `refresh` at every gesture start) is the fallback.
  watch(
    [root, enabled],
    ([el, on]) => {
      if (!el || !on) return
      sync()
      if (typeof ResizeObserver === 'undefined') return

      // Re-measures instead of reading the entry: its sizes are logical (inline / block), and one
      // measurement keeps the observer and `refresh` from ever disagreeing.
      const observer = new ResizeObserver(() => sync())
      observer.observe(el)
      onWatcherCleanup(() => observer.disconnect())
    },
    { immediate: true, flush: 'sync' },
  )

  return {
    /** Whether the width / height is currently natural (content-sized). */
    naturalW: readonly(naturalW),
    naturalH: readonly(naturalH),
    /** Re-measure right now, e.g. right before a gesture starts. */
    refresh: sync,
  }
}
