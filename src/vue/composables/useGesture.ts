import { onScopeDispose, readonly, shallowRef, type Ref } from 'vue'

import { getInlineEndCorner } from '../../core/direction'
import { createGestures, type Gesture, type GesturePhase } from '../../core/gesture'
import { isPrimaryPointer, trackPointer } from '../../core/pointer'
import { dragRect, resizeRect, resizeRectTo, stepResizeRect } from '../../core/positioning'
import type {
  ConstraintOptions,
  Direction,
  PhysicalResizeHandle,
  Rect,
  Size,
} from '../../core/types'
import type { ContainerMember, DraggableResizableEmit, ResizeToSize } from '../types'

export interface UseGestureOptions {
  rect: Ref<Rect>
  /** Inner size of the parent, for `parent` bounds and snapping. */
  parentSize: Readonly<Ref<Size | null>>
  /** The text direction: `resizeTo` changes the size at the inline-end edge. */
  direction: () => Direction
  /** Re-measures the element, before a gesture begins. */
  measure: () => void
  constraints: Readonly<Ref<ConstraintOptions>>
  draggable: () => boolean
  resizable: () => boolean
  /** Whether resizing from a `t` / `l` edge moves the rect to keep the opposite edge in place. */
  anchor: () => boolean
  /** Whether both horizontal edges move while resizing (a centred line in flow layout). */
  symmetric: () => boolean
  /** Membership in a `DraggableContainer`, for snapping while dragging. */
  member: ContainerMember | null
  emit: DraggableResizableEmit
}

/**
 * Drags and resizes an element by pointer, key steps and `resizeTo`, feeding the Gesture session
 * (`core/gesture`) with the rects computed under the constraints. Stops tracking the pointer when
 * the owning scope is disposed.
 */
export const useGesture = ({
  rect,
  parentSize,
  direction,
  measure,
  constraints,
  draggable,
  resizable,
  anchor,
  symmetric,
  member,
  emit,
}: UseGestureOptions) => {
  const gesture = shallowRef<Gesture | null>(null)
  // Stops tracking the current pointer gesture and runs its cleanup, without end events.
  let stopPointer: (() => void) | null = null

  const emitPhase = (phase: GesturePhase, current: Gesture, next: Rect) => {
    if (current.kind === 'drag') {
      const point = { x: next.x, y: next.y }
      if (phase === 'start') emit('drag-start', point)
      else if (phase === 'move') emit('dragging', point)
      else emit('drag-end', point)
    } else if (phase === 'start') emit('resize-start', next)
    else if (phase === 'move') emit('resizing', next)
    else emit('resize-end', next)
  }

  const gestures = createGestures({
    measure,
    read: () => rect.value,
    write: (next) => {
      rect.value = next
    },
    emit: emitPhase,
    onChange: (next) => {
      gesture.value = next
    },
  })

  /**
   * Begins `next` and follows the pointer of `event` until it is released. `onMove` gets the
   * distance since the press and the rect measured at the press, and returns the rect to move to; a move of zero before any movement
   * is not a movement (some touch stacks fire one right at the press). `cleanup` runs when the
   * gesture ends and when it is cancelled.
   */
  const track = (
    event: PointerEvent,
    next: Gesture,
    onMove: (deltaX: number, deltaY: number, start: Rect) => Rect,
    cleanup: () => void = () => {},
  ) => {
    const pointer = gestures.begin(next)
    if (!pointer) return false
    let moved = false

    const stop = trackPointer(event, {
      onMove: (deltaX, deltaY) => {
        if (!moved && deltaX === 0 && deltaY === 0) return
        moved = true
        pointer.move(onMove(deltaX, deltaY, pointer.start))
      },
      onEnd: () => {
        stopPointer = null
        cleanup()
        pointer.end()
      },
    })
    stopPointer = () => {
      stop()
      cleanup()
    }
    return true
  }

  const startDrag = (event: PointerEvent) => {
    if (!draggable() || !isPrimaryPointer(event)) return
    let snap: ReturnType<ContainerMember['startSnap']> | null = null

    const started = track(
      event,
      { kind: 'drag' },
      (deltaX, deltaY, { x, y }) => {
        const current = rect.value
        // Only the position is fixed at the start; bounds and snapping use the current size.
        const next = dragRect({
          start: { ...current, x, y },
          deltaX,
          deltaY,
          options: constraints.value,
          parentSize: parentSize.value,
          guides: snap?.guides ?? null,
        })
        snap?.publish(next.matchedGuides)
        return { ...current, x: next.x, y: next.y }
      },
      () => snap?.end(),
    )
    if (started) snap = member?.startSnap(parentSize.value) ?? null
  }

  const startResize = (event: PointerEvent, handle: PhysicalResizeHandle) => {
    if (!resizable() || !isPrimaryPointer(event)) return

    track(event, { kind: 'resize', handle }, (deltaX, deltaY, start) =>
      resizeRect({
        handle,
        start,
        deltaX,
        deltaY,
        options: constraints.value,
        parentSize: parentSize.value,
        anchor: anchor(),
        symmetric: symmetric(),
      }),
    )
  }

  /** Moves the element by one key step; the first step that moves it emits `drag-start`. */
  const stepDrag = (deltaX: number, deltaY: number) =>
    gestures.step({ kind: 'drag' }, draggable(), (current) => {
      const { x, y } = dragRect({
        start: current,
        deltaX,
        deltaY,
        options: constraints.value,
        parentSize: parentSize.value,
        guides: null,
      })
      return x === current.x && y === current.y ? null : { ...current, x, y }
    })

  /**
   * Resizes the element by one key step at the edges of its bottom corner `handle` (see
   * `stepResizeRect`); the first step that changes it emits `resize-start`. A step to an unbounded
   * limit (`Infinity` without a max size) is ignored.
   */
  const stepResize = (growW: number, growH: number, handle: 'bl' | 'br') =>
    gestures.step({ kind: 'resize', handle }, resizable(), (current) => {
      return stepResizeRect({
        start: current,
        growW,
        growH,
        handle,
        options: constraints.value,
        parentSize: parentSize.value,
        anchor: anchor(),
      })
    })

  /**
   * Resizes the element to `size` at its inline-end / block-end edges (see `resizeRectTo`), as one
   * gesture that ends at once: the three resize events, or none if nothing changes. Never joins or
   * ends a running gesture — it is ignored then.
   */
  const resizeTo = (size: ResizeToSize) => {
    if (!resizable()) return
    gestures.once((current) => {
      // After measuring: the corner follows the current direction.
      const handle = getInlineEndCorner(direction())
      const next = resizeRectTo({
        start: current,
        size,
        handle,
        options: constraints.value,
        parentSize: parentSize.value,
        anchor: anchor(),
      })
      return next && { gesture: { kind: 'resize', handle }, rect: next }
    })
  }

  // Unmounting mid-gesture stops it without emitting an end event and hides its matched guides.
  onScopeDispose(() => {
    stopPointer?.()
    stopPointer = null
    gestures.cancel()
  })

  return {
    gesture: readonly(gesture),
    startDrag,
    startResize,
    stepDrag,
    stepResize,
    endSteps: gestures.endSteps,
    resizeTo,
  }
}
