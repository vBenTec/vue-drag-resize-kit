import { vi } from 'vitest'
import { nextTick } from 'vue'

type PointerType = 'pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel'

export const pointer = (
  target: EventTarget,
  type: PointerType,
  x = 0,
  y = 0,
  init: PointerEventInit = {},
) =>
  target.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      pointerId: 1,
      button: 0,
      clientX: x,
      clientY: y,
      ...init,
    }),
  )

/** Presses on `target`, moves by the given distance and releases. */
export const dragBy = async (target: Element, deltaX: number, deltaY: number) => {
  pointer(target, 'pointerdown', 100, 100)
  pointer(document, 'pointermove', 100 + deltaX, 100 + deltaY)
  pointer(document, 'pointerup', 100 + deltaX, 100 + deltaY)
  await nextTick()
}

/** happy-dom does not lay anything out, so tests state the inner size of an element. */
export const setInnerSize = (element: Element, width: number, height: number) => {
  Object.defineProperty(element, 'clientWidth', { configurable: true, get: () => width })
  Object.defineProperty(element, 'clientHeight', { configurable: true, get: () => height })
}

/** A `ResizeObserver` created by {@link stubResizeObserver}, triggerable from a test. */
export interface ResizeObserverStub {
  targets: Element[]
  /** Fires the observer's callback with fabricated entries. */
  trigger: (entries?: Partial<ResizeObserverEntry>[]) => void
}

/**
 * Replaces the global `ResizeObserver` (happy-dom does not lay anything out) and returns the
 * created observers, in creation order. Undone by `vi.unstubAllGlobals()`.
 */
export const stubResizeObserver = (): ResizeObserverStub[] => {
  const observers: ResizeObserverStub[] = []

  class FakeResizeObserver implements ResizeObserverStub {
    targets: Element[] = []

    constructor(private readonly callback: ResizeObserverCallback) {
      observers.push(this)
    }

    observe(target: Element) {
      this.targets.push(target)
    }

    unobserve(target: Element) {
      this.targets = this.targets.filter((other) => other !== target)
    }

    disconnect() {
      this.targets = []
    }

    trigger(entries: Partial<ResizeObserverEntry>[] = []) {
      this.callback(entries as ResizeObserverEntry[], this as unknown as ResizeObserver)
    }
  }

  vi.stubGlobal('ResizeObserver', FakeResizeObserver)
  return observers
}

/** Stubs the measured (fractional) size of an element, as `getBoundingClientRect` reports it. */
export const setMeasuredSize = (element: Element, width: number, height: number) => {
  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({ width, height, x: 0, y: 0, top: 0, left: 0, right: width, bottom: height }),
  })
}

export const rectOf = (element: Element) => {
  const { left, top, width, height } = (element as HTMLElement).style
  return { x: parseFloat(left), y: parseFloat(top), w: parseFloat(width), h: parseFloat(height) }
}
