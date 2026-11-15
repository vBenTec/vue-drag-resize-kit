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

  const measureRoot = (): Size | null => {
    const el = root.value
    if (!el) return null
    const { width, height } = el.getBoundingClientRect()
    return { width, height }
  }

  /** Writes the rendered size into the natural models. */
  const sync = (size: Size | null = null) => {
    if (!enabled() || (!naturalW.value && !naturalH.value)) return
    const measured = size ?? measureRoot()
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
      // A dimension reset to natural picks up the rendered size right away.
      if (nextW === true || nextH === true) sync()
    },
    { flush: 'sync' },
  )

  // `sync` flush: observe during mount, like `useParentSize`. Without a `ResizeObserver` the
  // one-shot measure (plus `refresh` at every gesture start) is the fallback.
  watch(
    [root, enabled],
    ([el, on]) => {
      if (!el || !on) return
      sync()
      if (typeof ResizeObserver === 'undefined') return

      const observer = new ResizeObserver((entries) => {
        // `borderBoxSize` is fractional; the box equals the content box (no border, see styles).
        const box = entries.at(-1)?.borderBoxSize?.[0]
        sync(box ? { width: box.inlineSize, height: box.blockSize } : null)
      })
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
    refresh: () => sync(),
  }
}
