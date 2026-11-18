import { onScopeDispose, readonly, shallowRef, type Ref, type ShallowRef } from 'vue'

import { isPrimaryPointer, trackPointer, type PointerSessionHandlers } from '../../core/pointer'
import { dragRect, isSameRect, resizeRect, stepResizeRect } from '../../core/positioning'
import type { ConstraintOptions, PhysicalResizeHandle, Rect } from '../../core/types'
import type { ContainerMember, DraggableResizableEmit } from '../types'
import { useParentSize } from './useParentSize'

/** The gesture an element is performing: a drag, or a resize by one of its handles. */
export type Gesture = { kind: 'drag' } | { kind: 'resize'; handle: PhysicalResizeHandle }

export interface UseGestureOptions {
  /** The element; its parent is measured for `parent` bounds and snapping. */
  root: Readonly<ShallowRef<HTMLElement | null>>
  rect: Ref<Rect>
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
 * Drags and resizes an element, one gesture at a time: a pointer gesture, or a keyboard sequence
 * of steps. Re-measures the parent when a gesture starts and stops tracking the pointer when the
 * owning scope is disposed.
 */
export const useGesture = ({
  root,
  rect,
  constraints,
  draggable,
  resizable,
  anchor,
  symmetric,
  member,
  emit,
}: UseGestureOptions) => {
  const gesture = shallowRef<Gesture | null>(null)
  // Stops the current gesture without end events and runs its cleanup.
  let cancel: (() => void) | null = null
  // Whether the current gesture is a keyboard sequence, which runs until `endSteps()`.
  let stepping = false

  // The parent's size is needed for `parent` bounds and for snapping to the parent's edges.
  const { parentSize, refresh: refreshParentSize } = useParentSize(
    root,
    () => !!constraints.value.parent || member !== null,
  )

  /** Whether `event` may start a gesture. */
  const canStart = (event: PointerEvent, enabled: boolean) =>
    enabled && !gesture.value && isPrimaryPointer(event)

  /**
   * Follows the pointer of `event` until it is released. `cleanup` runs when the gesture ends,
   * before `onEnd`, and when it is cancelled.
   */
  const track = (
    event: PointerEvent,
    { onMove, onEnd }: PointerSessionHandlers,
    cleanup: () => void = () => {},
  ) => {
    const stop = trackPointer(event, {
      onMove,
      onEnd: () => {
        cancel = null
        gesture.value = null
        cleanup()
        onEnd()
      },
    })
    cancel = () => {
      stop()
      cleanup()
    }
  }

  const startDrag = (event: PointerEvent) => {
    if (!canStart(event, draggable())) return
    refreshParentSize()

    // Only the position is fixed at the start; bounds and snapping use the current size.
    const origin = { x: rect.value.x, y: rect.value.y }
    const snap = member?.startSnap(parentSize.value) ?? null

    gesture.value = { kind: 'drag' }
    // `drag-start` waits for the first movement: a press that never moves emits nothing.
    let started = false

    track(
      event,
      {
        onMove: (deltaX, deltaY) => {
          // Some touch stacks fire one zero-delta move right at the press; it is not a movement.
          if (!started && deltaX === 0 && deltaY === 0) return
          if (!started) {
            started = true
            emit('drag-start', { ...origin })
          }

          const current = rect.value
          const next = dragRect({
            start: { ...current, ...origin },
            deltaX,
            deltaY,
            options: constraints.value,
            parentSize: parentSize.value,
            guides: snap?.guides ?? null,
          })

          snap?.publish(next.matchedGuides)

          rect.value = { ...current, x: next.x, y: next.y }
          emit('dragging', { x: next.x, y: next.y })
        },
        onEnd: () => {
          if (started) emit('drag-end', { x: rect.value.x, y: rect.value.y })
        },
      },
      () => snap?.end(),
    )
  }

  const startResize = (event: PointerEvent, handle: PhysicalResizeHandle) => {
    if (!canStart(event, resizable())) return
    refreshParentSize()

    const start = rect.value

    gesture.value = { kind: 'resize', handle }
    // `resize-start` waits for the first movement: a press that never moves emits nothing.
    let started = false

    track(event, {
      onMove: (deltaX, deltaY) => {
        if (!started && deltaX === 0 && deltaY === 0) return
        if (!started) {
          started = true
          emit('resize-start', start)
        }

        const next = resizeRect({
          handle,
          start,
          deltaX,
          deltaY,
          options: constraints.value,
          parentSize: parentSize.value,
          anchor: anchor(),
          symmetric: symmetric(),
        })

        rect.value = next
        emit('resizing', next)
      },
      onEnd: () => {
        if (started) emit('resize-end', rect.value)
      },
    })
  }

  /**
   * Whether a keyboard step of `kind` may run: never during a pointer gesture. A running sequence
   * of the other kind ends first.
   */
  const canStep = (kind: Gesture['kind'], enabled: boolean) => {
    if (stepping && gesture.value?.kind !== kind) endSteps()
    if (!enabled || (gesture.value && !stepping)) return false
    if (!stepping) refreshParentSize()
    return true
  }

  // Like a pointer gesture, a sequence starts with the first step that changes anything.
  const beginSteps = (next: Gesture) => {
    stepping = true
    gesture.value = next
    if (next.kind === 'drag') emit('drag-start', { x: rect.value.x, y: rect.value.y })
    else emit('resize-start', rect.value)
  }

  /** Moves the element by one keyboard step; the first step that moves it emits `drag-start`. */
  const stepDrag = (deltaX: number, deltaY: number) => {
    if (!canStep('drag', draggable())) return
    const current = rect.value
    const { x, y } = dragRect({
      start: current,
      deltaX,
      deltaY,
      options: constraints.value,
      parentSize: parentSize.value,
      guides: null,
    })
    if (x === current.x && y === current.y) return
    if (!stepping) beginSteps({ kind: 'drag' })
    rect.value = { ...current, x, y }
    emit('dragging', { x, y })
  }

  /**
   * Resizes the element by one keyboard step at the edges of its bottom corner `handle` (see
   * `stepResizeRect`); the first step that changes it emits `resize-start`. A step to an unbounded
   * limit (`Infinity` without a max size) is ignored.
   */
  const stepResize = (growW: number, growH: number, handle: 'bl' | 'br') => {
    if (!canStep('resize', resizable())) return
    const current = rect.value
    const next = stepResizeRect({
      start: current,
      growW,
      growH,
      handle,
      options: constraints.value,
      parentSize: parentSize.value,
      anchor: anchor(),
    })
    if (!Number.isFinite(next.w) || !Number.isFinite(next.h) || isSameRect(next, current)) return
    if (!stepping) beginSteps({ kind: 'resize', handle })
    rect.value = next
    emit('resizing', next)
  }

  /** Ends the running keyboard sequence, emitting `drag-end` / `resize-end`. */
  const endSteps = () => {
    const current = gesture.value
    if (!stepping || !current) return
    stepping = false
    gesture.value = null
    if (current.kind === 'drag') emit('drag-end', { x: rect.value.x, y: rect.value.y })
    else emit('resize-end', rect.value)
  }

  // Unmounting mid-gesture stops it without emitting an end event and hides its matched guides.
  onScopeDispose(() => {
    cancel?.()
    cancel = null
    stepping = false
  })

  return {
    gesture: readonly(gesture),
    startDrag,
    startResize,
    stepDrag,
    stepResize,
    endSteps,
  }
}
