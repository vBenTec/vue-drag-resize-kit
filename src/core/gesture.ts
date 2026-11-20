import type { PhysicalResizeHandle, Rect } from './types'

/** The gesture an element is performing: a drag, or a resize by one of its handles. */
export type Gesture = { kind: 'drag' } | { kind: 'resize'; handle: PhysicalResizeHandle }

/** Where in its gesture an event is: `start`, every `move`, and `end`. */
export type GesturePhase = 'start' | 'move' | 'end'

export interface GestureHost {
  /** Re-measures the element; runs before a gesture reads the rect it begins with. */
  measure: () => void
  /** The element's current rect. */
  read: () => Rect
  /** Moves or resizes the element. */
  write: (rect: Rect) => void
  /** Reports a phase of `gesture` with the rect it carries. */
  emit: (phase: GesturePhase, gesture: Gesture, rect: Rect) => void
  /** Called with the running gesture whenever it changes, `null` once none runs. */
  onChange: (gesture: Gesture | null) => void
}

/** A pointer gesture in progress. */
export interface PointerGesture {
  /** The rect the gesture began with, measured at the press. */
  start: Rect
  /** Applies the rect of a pointer movement; the first one emits `start`. */
  move: (next: Rect) => void
  /** Ends the gesture on release; `end` only follows a `start`. */
  end: () => void
}

/** Computes the rect after a step from the current one, `null` if the step changes nothing. */
export type StepTarget = (current: Rect) => Rect | null

/**
 * The gestures of one element, at most one at a time: a pointer gesture, a key sequence or a
 * one-step resize. Owns the event protocol — `start` waits for the first change and carries the
 * rect the gesture began with, `end` carries the final rect — and leaves computing rects to the
 * caller.
 */
export const createGestures = (host: GestureHost) => {
  let current: Gesture | null = null
  // Whether the current gesture is a key sequence, which runs until `endSteps()`.
  let stepping = false

  const set = (gesture: Gesture | null) => {
    current = gesture
    host.onChange(gesture)
  }

  /**
   * Begins a pointer gesture: it runs from the press, but `start` waits for the first `move`, so
   * a press that never moves emits nothing. `null` while another gesture runs.
   */
  const begin = (gesture: Gesture): PointerGesture | null => {
    if (current) return null
    host.measure()
    const start = host.read()
    let started = false
    set(gesture)

    return {
      start,
      move: (next) => {
        if (!started) {
          started = true
          host.emit('start', gesture, start)
        }
        host.write(next)
        host.emit('move', gesture, next)
      },
      end: () => {
        if (current !== gesture) return
        set(null)
        if (started) host.emit('end', gesture, host.read())
      },
    }
  }

  /** Ends the running key sequence, emitting `end`. */
  const endSteps = () => {
    const gesture = current
    if (!stepping || !gesture) return
    stepping = false
    set(null)
    host.emit('end', gesture, host.read())
  }

  /**
   * One step of a key sequence of `gesture`; the sequence starts with the first step that changes
   * the element. A running sequence of the other kind ends first; during a pointer gesture the
   * step is ignored, and so is a step that is not `enabled` (after ending the other kind). A step
   * that could start the sequence measures first.
   */
  const step = (gesture: Gesture, enabled: boolean, target: StepTarget) => {
    if (stepping && current?.kind !== gesture.kind) endSteps()
    if (!enabled || (current && !stepping)) return
    if (!stepping) host.measure()
    const before = host.read()
    const next = target(before)
    if (!next) return
    if (!stepping) {
      stepping = true
      set(gesture)
      host.emit('start', gesture, before)
    }
    host.write(next)
    host.emit('move', gesture, next)
  }

  /**
   * A gesture of one step that ends at once: `start`, `move` and `end`, with `end` carrying the
   * computed rect (a controlled model has not followed yet). Ignored while a gesture runs, and
   * emits nothing if `target` returns `null`. `target` runs after measuring, so it may pick the
   * gesture (e.g. the handle) from fresh measurements.
   */
  const once = (target: (current: Rect) => { gesture: Gesture; rect: Rect } | null) => {
    if (current) return
    host.measure()
    const before = host.read()
    const result = target(before)
    if (!result) return
    const { gesture, rect: next } = result
    host.emit('start', gesture, before)
    host.write(next)
    host.emit('move', gesture, next)
    host.emit('end', gesture, next)
  }

  /** Stops the running gesture without an `end`. */
  const cancel = () => {
    stepping = false
    if (current) set(null)
  }

  return { begin, step, endSteps, once, cancel }
}

export type Gestures = ReturnType<typeof createGestures>
