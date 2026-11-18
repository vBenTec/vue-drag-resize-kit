import { mount } from '@vue/test-utils'
import { vi } from 'vitest'
import { nextTick } from 'vue'

import DraggableResizable from '../vue/components/DraggableResizable.vue'
import type { DraggableResizableProps } from '../vue/types'

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

export type ElementProps = DraggableResizableProps & {
  x?: number
  y?: number
  w?: number
  h?: number
  active?: boolean
  'onUpdate:w'?: (value: number) => void
  'onUpdate:h'?: (value: number) => void
}

/**
 * Mounts a 100x50 element at 100/100 inside a 300x300 parent, in a host with the given styles
 * (happy-dom inherits `direction` from styles, not from the `dir` attribute).
 */
export const mountElement = (props: ElementProps = {}, hostStyle = '') => {
  const host = document.createElement('div')
  host.style.cssText = hostStyle
  document.body.appendChild(host)
  const wrapper = mount(DraggableResizable, {
    attachTo: host,
    props: { x: 100, y: 100, w: 100, h: 50, ...props },
  })
  setInnerSize(wrapper.element.parentElement!, 300, 300)
  return wrapper
}

export const handleOf = (root: Element, name: string) =>
  root.querySelector<HTMLElement>(`[data-handle="${name}"]`)!

/** The `data-handle` names of the rendered handles, in order. */
export const handleNames = (root: Element) =>
  [...root.querySelectorAll<HTMLElement>('.vdr-handle')].map((handle) => handle.dataset.handle)

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

/**
 * Stubs the rendered (fractional) size of an element, as `getComputedStyle` resolves it: its inline
 * `width` / `height` where it has one, like a real layout, otherwise the given natural size. Undone
 * by `vi.unstubAllGlobals()`.
 */
export const setMeasuredSize = (element: Element, width: number, height: number) => {
  const { style } = element as HTMLElement
  const resolve = getComputedStyle
  vi.stubGlobal('getComputedStyle', (target: Element, pseudo?: string | null) => {
    const resolved = resolve(target, pseudo)
    if (target !== element) return resolved
    return new Proxy(resolved, {
      get: (base, key) => {
        if (key === 'width') return style.width || `${width}px`
        if (key === 'height') return style.height || `${height}px`
        return Reflect.get(base, key)
      },
    })
  })
}

/** happy-dom does not lay anything out, so tests state where an element sits in its offset parent. */
export const setOffset = (element: Element, left: number, top: number) => {
  Object.defineProperty(element, 'offsetLeft', { configurable: true, get: () => left })
  Object.defineProperty(element, 'offsetTop', { configurable: true, get: () => top })
}

export const rectOf = (element: Element) => {
  const { left, top, width, height } = (element as HTMLElement).style
  return { x: parseFloat(left), y: parseFloat(top), w: parseFloat(width), h: parseFloat(height) }
}
