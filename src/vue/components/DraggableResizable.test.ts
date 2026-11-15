import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

import { ALL_HANDLES } from '../../core/handles'
import type { ResizeHandle } from '../../core/types'
import {
  dragBy,
  pointer,
  rectOf,
  setInnerSize,
  setMeasuredSize,
  stubResizeObserver,
} from '../../test-utils'
import type { DraggableResizableProps } from '../types'
import DraggableResizable from './DraggableResizable.vue'

type Props = DraggableResizableProps & {
  x?: number
  y?: number
  w?: number
  h?: number
  active?: boolean
  'onUpdate:w'?: (value: number) => void
  'onUpdate:h'?: (value: number) => void
}

/** Mounts a 100x50 element at 100/100 inside a 300x300 parent. */
const mountElement = (props: Props = {}) => {
  const wrapper = mount(DraggableResizable, {
    attachTo: document.body,
    props: { x: 100, y: 100, w: 100, h: 50, ...props },
  })
  setInnerSize(wrapper.element.parentElement!, 300, 300)
  return wrapper
}

const handle = (wrapper: ReturnType<typeof mountElement>, name: ResizeHandle) =>
  wrapper.get(`[data-handle="${name}"]`).element

const eventTypes = (calls: unknown[][]) => calls.map(([type]) => String(type)).toSorted()

afterEach(() => {
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
})

describe('rendering', () => {
  it('positions and sizes the element', () => {
    const wrapper = mountElement()
    expect(rectOf(wrapper.element)).toEqual({ x: 100, y: 100, w: 100, h: 50 })
  })

  it('uses initW / initH while w / h are not set', () => {
    const wrapper = mount(DraggableResizable, { props: { initW: 40, initH: 80 } })
    expect(rectOf(wrapper.element)).toEqual({ x: 0, y: 0, w: 40, h: 80 })
  })

  it('renders the default slot', () => {
    const wrapper = mount(DraggableResizable, { slots: { default: 'Hello' } })
    expect(wrapper.text()).toBe('Hello')
  })

  it('renders the requested handles, ignoring invalid ones', async () => {
    const wrapper = mountElement()
    expect(wrapper.findAll('.vdr-handle').map((node) => node.attributes('data-handle'))).toEqual([
      ...ALL_HANDLES,
    ])

    await wrapper.setProps({ handles: ['br', 'tl', 'nope' as ResizeHandle] })
    expect(wrapper.findAll('.vdr-handle').map((node) => node.attributes('data-handle'))).toEqual([
      'br',
      'tl',
    ])

    await wrapper.setProps({ resizable: false })
    expect(wrapper.findAll('.vdr-handle')).toHaveLength(0)
  })

  it('exposes state as data attributes and classes', async () => {
    const wrapper = mountElement({ classNameActive: 'is-active', classNameHandle: 'grip' })
    expect(wrapper.classes()).toEqual(['vdr-container', 'vdr-draggable', 'vdr-resizable'])
    expect(wrapper.attributes('data-active')).toBeUndefined()

    pointer(wrapper.element, 'pointerdown', 0, 0)
    await nextTick()
    expect(wrapper.attributes('data-active')).toBe('true')
    expect(wrapper.attributes('data-dragging')).toBe('true')
    expect(wrapper.classes()).toContain('is-active')
    expect(wrapper.classes()).toContain('vdr-dragging')
    expect(handle(wrapper, 'tl').className).toBe('vdr-handle vdr-handle-tl grip grip-tl')

    pointer(document, 'pointerup')
    pointer(handle(wrapper, 'br'), 'pointerdown', 0, 0)
    await nextTick()
    expect(wrapper.attributes('data-dragging')).toBeUndefined()
    expect(wrapper.attributes('data-resizing')).toBe('br')
    expect(wrapper.classes()).toContain('vdr-resizing')
  })

  it('does not duplicate the default handle class', () => {
    const wrapper = mountElement()
    expect(handle(wrapper, 'tl').className).toBe('vdr-handle vdr-handle-tl')
  })
})

describe('activation', () => {
  it('activates on pointer down and deactivates on pointer down outside', async () => {
    const wrapper = mountElement()

    pointer(wrapper.element, 'pointerdown')
    pointer(document, 'pointerup')
    await nextTick()
    expect(wrapper.emitted('update:active')).toEqual([[true]])
    expect(wrapper.emitted('activated')).toHaveLength(1)

    pointer(document.body, 'pointerdown')
    await nextTick()
    expect(wrapper.emitted('update:active')).toEqual([[true], [false]])
    expect(wrapper.emitted('deactivated')).toHaveLength(1)
  })

  it('only shows handles while active', async () => {
    const wrapper = mountElement()
    expect((handle(wrapper, 'tl') as HTMLElement).style.display).toBe('none')

    await wrapper.setProps({ active: true })
    expect((handle(wrapper, 'tl') as HTMLElement).style.display).toBe('')
  })
})

describe('dragging', () => {
  it('moves the element and emits typed payloads', async () => {
    const wrapper = mountElement()

    pointer(wrapper.element, 'pointerdown', 10, 10)
    pointer(document, 'pointermove', 30, 5)
    pointer(document, 'pointermove', 40, 0)
    pointer(document, 'pointerup', 40, 0)
    await nextTick()

    expect(rectOf(wrapper.element)).toEqual({ x: 130, y: 90, w: 100, h: 50 })
    expect(wrapper.emitted('drag-start')).toEqual([[{ x: 100, y: 100 }]])
    expect(wrapper.emitted('dragging')).toEqual([[{ x: 120, y: 95 }], [{ x: 130, y: 90 }]])
    expect(wrapper.emitted('drag-end')).toEqual([[{ x: 130, y: 90 }]])
    expect(wrapper.emitted('update:x')?.at(-1)).toEqual([130])
    expect(wrapper.emitted('update:y')?.at(-1)).toEqual([90])
    expect(wrapper.emitted('update:w')).toBeUndefined()
    expect(wrapper.emitted('update:h')).toBeUndefined()
  })

  it('ignores other pointers and non-primary buttons', async () => {
    const wrapper = mountElement()

    pointer(wrapper.element, 'pointerdown', 0, 0, { button: 2 })
    pointer(document, 'pointermove', 50, 50)
    expect(wrapper.emitted('drag-start')).toBeUndefined()

    pointer(wrapper.element, 'pointerdown', 0, 0)
    pointer(document, 'pointermove', 50, 50, { pointerId: 2 })
    pointer(document, 'pointerup', 50, 50, { pointerId: 2 })
    await nextTick()
    expect(wrapper.attributes('data-dragging')).toBe('true')
    expect(rectOf(wrapper.element)).toMatchObject({ x: 100, y: 100 })
  })

  it('ends the drag on pointercancel', async () => {
    const wrapper = mountElement()
    pointer(wrapper.element, 'pointerdown', 0, 0)
    pointer(document, 'pointermove', 5, 5)
    pointer(document, 'pointercancel', 5, 5)
    await nextTick()
    expect(wrapper.attributes('data-dragging')).toBeUndefined()
    expect(wrapper.emitted('drag-end')).toHaveLength(1)
  })

  it('does nothing when draggable is false, and reacts to the prop changing', async () => {
    const wrapper = mountElement({ draggable: false })
    await dragBy(wrapper.element, 20, 20)
    expect(rectOf(wrapper.element)).toMatchObject({ x: 100, y: 100 })
    expect(wrapper.emitted('drag-start')).toBeUndefined()

    await wrapper.setProps({ draggable: true })
    await dragBy(wrapper.element, 20, 20)
    expect(rectOf(wrapper.element)).toMatchObject({ x: 120, y: 120 })
  })

  it('honours disabledX / disabledY', async () => {
    const wrapper = mountElement({ disabledX: true })
    await dragBy(wrapper.element, 20, 30)
    expect(rectOf(wrapper.element)).toMatchObject({ x: 100, y: 130 })

    await wrapper.setProps({ disabledX: false, disabledY: true })
    await dragBy(wrapper.element, 20, 30)
    expect(rectOf(wrapper.element)).toMatchObject({ x: 120, y: 130 })
  })

  it('is not restricted to the parent by default', async () => {
    const wrapper = mountElement()
    await dragBy(wrapper.element, -500, 500)
    expect(rectOf(wrapper.element)).toMatchObject({ x: -400, y: 600 })
  })

  it('stays inside the parent with `parent`, and reacts to the prop changing', async () => {
    const wrapper = mountElement({ parent: true })
    await dragBy(wrapper.element, 500, 500)
    expect(rectOf(wrapper.element)).toMatchObject({ x: 200, y: 250 })
    await dragBy(wrapper.element, -500, -500)
    expect(rectOf(wrapper.element)).toMatchObject({ x: 0, y: 0 })

    await wrapper.setProps({ parent: false })
    await dragBy(wrapper.element, -50, -50)
    expect(rectOf(wrapper.element)).toMatchObject({ x: -50, y: -50 })
  })

  it('keeps inside the parent with the current size when it changes mid-drag', async () => {
    const wrapper = mountElement({ parent: true })

    pointer(wrapper.element, 'pointerdown', 0, 0)
    pointer(document, 'pointermove', 10, 0)
    await wrapper.setProps({ w: 150 })
    pointer(document, 'pointermove', 500, 0)
    await nextTick()

    expect(wrapper.emitted('update:x')?.at(-1)).toEqual([150])
  })
})

describe('resizing', () => {
  it.each([
    ['tl', { x: 110, y: 120, w: 90, h: 30 }],
    ['tm', { x: 100, y: 120, w: 100, h: 30 }],
    ['tr', { x: 100, y: 120, w: 110, h: 30 }],
    ['ml', { x: 110, y: 100, w: 90, h: 50 }],
    ['mr', { x: 100, y: 100, w: 110, h: 50 }],
    ['bl', { x: 110, y: 100, w: 90, h: 70 }],
    ['bm', { x: 100, y: 100, w: 100, h: 70 }],
    ['br', { x: 100, y: 100, w: 110, h: 70 }],
  ] as const)('%s resizes only its own edges', async (name, expected) => {
    const wrapper = mountElement({ active: true })
    await dragBy(handle(wrapper, name), 10, 20)
    expect(rectOf(wrapper.element)).toEqual(expected)
  })

  it('emits typed payloads and does not start a drag', async () => {
    const wrapper = mountElement({ active: true })

    pointer(handle(wrapper, 'br'), 'pointerdown', 0, 0)
    pointer(document, 'pointermove', 10, 20)
    pointer(document, 'pointerup', 10, 20)
    await nextTick()

    expect(wrapper.emitted('resize-start')).toEqual([[{ x: 100, y: 100, w: 100, h: 50 }]])
    expect(wrapper.emitted('resizing')).toEqual([[{ x: 100, y: 100, w: 110, h: 70 }]])
    expect(wrapper.emitted('resize-end')).toEqual([[{ x: 100, y: 100, w: 110, h: 70 }]])
    expect(wrapper.emitted('update:w')?.at(-1)).toEqual([110])
    expect(wrapper.emitted('update:h')?.at(-1)).toEqual([70])
    expect(wrapper.emitted('drag-start')).toBeUndefined()
    expect(wrapper.attributes('data-resizing')).toBeUndefined()
  })

  it('honours min and max sizes, reactively', async () => {
    const wrapper = mountElement({ active: true, minW: 60, minH: 40, maxW: 150, maxH: 80 })

    await dragBy(handle(wrapper, 'br'), -500, -500)
    expect(rectOf(wrapper.element)).toMatchObject({ w: 60, h: 40 })

    await dragBy(handle(wrapper, 'br'), 500, 500)
    expect(rectOf(wrapper.element)).toMatchObject({ w: 150, h: 80 })

    await wrapper.setProps({ maxW: 200 })
    await dragBy(handle(wrapper, 'br'), 500, 500)
    expect(rectOf(wrapper.element)).toMatchObject({ w: 200, h: 80 })
  })

  it('defaults to a minimum size of 20', async () => {
    const wrapper = mountElement({ active: true })
    await dragBy(handle(wrapper, 'tl'), 500, 500)
    expect(rectOf(wrapper.element)).toEqual({ x: 180, y: 130, w: 20, h: 20 })
  })

  it('honours disabledW / disabledH', async () => {
    const wrapper = mountElement({ active: true, disabledW: true })
    await dragBy(handle(wrapper, 'br'), 10, 20)
    expect(rectOf(wrapper.element)).toMatchObject({ w: 100, h: 70 })

    await wrapper.setProps({ disabledW: false, disabledH: true })
    await dragBy(handle(wrapper, 'br'), 10, 20)
    expect(rectOf(wrapper.element)).toMatchObject({ w: 110, h: 70 })
  })

  it('stays inside the parent with `parent`', async () => {
    const wrapper = mountElement({ active: true, parent: true })
    await dragBy(handle(wrapper, 'br'), 500, 500)
    expect(rectOf(wrapper.element)).toEqual({ x: 100, y: 100, w: 200, h: 200 })

    await dragBy(handle(wrapper, 'tl'), -500, -500)
    expect(rectOf(wrapper.element)).toEqual({ x: 0, y: 0, w: 300, h: 300 })
  })

  it('keeps the aspect ratio only with lockAspectRatio', async () => {
    const wrapper = mountElement({ active: true })
    await dragBy(handle(wrapper, 'mr'), 20, 0)
    expect(rectOf(wrapper.element)).toMatchObject({ w: 120, h: 50 })

    await wrapper.setProps({ lockAspectRatio: true })
    await dragBy(handle(wrapper, 'mr'), 120, 0)
    expect(rectOf(wrapper.element)).toMatchObject({ w: 240, h: 100 })
  })

  it('starts no drag while resizing, even with a second pointer', async () => {
    const wrapper = mountElement({ active: true })

    pointer(handle(wrapper, 'br'), 'pointerdown', 0, 0)
    pointer(wrapper.element, 'pointerdown', 0, 0, { pointerId: 2 })
    pointer(document, 'pointermove', 10, 20)
    await nextTick()

    expect(wrapper.emitted('drag-start')).toBeUndefined()
    expect(wrapper.attributes('data-resizing')).toBe('br')
    expect(rectOf(wrapper.element)).toEqual({ x: 100, y: 100, w: 110, h: 70 })
  })

  it('does nothing when resizable is turned off mid-flight', async () => {
    const wrapper = mountElement({ active: true })
    const br = handle(wrapper, 'br')
    await wrapper.setProps({ resizable: false })
    await dragBy(br, 10, 10)
    expect(wrapper.emitted('resize-start')).toBeUndefined()
  })
})

describe('flow layout', () => {
  it('renders no position styles and marks the layout', async () => {
    const wrapper = mountElement({ layout: 'flow' })
    const { style } = wrapper.element

    expect(wrapper.attributes('data-layout')).toBe('flow')
    expect(style.left).toBe('')
    expect(style.top).toBe('')
    expect(style.width).toBe('100px')
    expect(style.height).toBe('50px')
  })

  it('keeps absolute mode unchanged by default', () => {
    const wrapper = mountElement()
    expect(wrapper.attributes('data-layout')).toBeUndefined()
    expect(rectOf(wrapper.element)).toEqual({ x: 100, y: 100, w: 100, h: 50 })
  })

  it('activates on press but never drags', async () => {
    const wrapper = mountElement({ layout: 'flow' })
    expect(wrapper.classes()).not.toContain('vdr-draggable')

    await dragBy(wrapper.element, 30, 30)
    expect(wrapper.emitted('update:active')).toEqual([[true]])
    expect(wrapper.emitted('drag-start')).toBeUndefined()
    expect(wrapper.emitted('dragging')).toBeUndefined()
    expect(wrapper.emitted('update:x')).toBeUndefined()
    expect(wrapper.emitted('update:y')).toBeUndefined()
  })

  it('resizes from t / l handles without moving the rect', async () => {
    const wrapper = mountElement({ layout: 'flow', active: true })

    await dragBy(handle(wrapper, 'tl'), -10, -20)
    expect(wrapper.emitted('update:w')?.at(-1)).toEqual([110])
    expect(wrapper.emitted('update:h')?.at(-1)).toEqual([70])
    expect(wrapper.emitted('update:x')).toBeUndefined()
    expect(wrapper.emitted('update:y')).toBeUndefined()
  })

  it('ignores `parent` in flow', async () => {
    const wrapper = mountElement({ layout: 'flow', active: true, parent: true })

    await dragBy(handle(wrapper, 'br'), 500, 500)
    // The 300x300 parent would cap the size in absolute mode.
    expect(wrapper.emitted('update:w')?.at(-1)).toEqual([600])
    expect(wrapper.emitted('update:h')?.at(-1)).toEqual([550])
  })

  it('recomputes the styles when the layout switches at runtime', async () => {
    const wrapper = mountElement()
    expect(wrapper.element.style.left).toBe('100px')

    await wrapper.setProps({ layout: 'flow' })
    expect(wrapper.attributes('data-layout')).toBe('flow')
    expect(wrapper.element.style.left).toBe('')

    await wrapper.setProps({ layout: 'absolute' })
    expect(wrapper.attributes('data-layout')).toBeUndefined()
    expect(wrapper.element.style.left).toBe('100px')
  })
})

/** Mounts a flow element without w / h, so both dimensions start natural. */
const mountNatural = (props: Props = {}) => {
  const observers = stubResizeObserver()
  const wrapper = mount(DraggableResizable, {
    attachTo: document.body,
    props: { layout: 'flow', active: true, ...props },
  })
  expect(observers).toHaveLength(1)
  const observer = observers[0]!

  /** The content renders at a new natural size: the browser lays it out and the observer fires. */
  const renderAt = (width: number, height: number) => {
    setMeasuredSize(wrapper.element, width, height)
    observer.trigger()
  }

  return { wrapper, renderAt }
}

describe('natural sizing (flow)', () => {
  it('syncs the rendered fractional size into the models without resize events', async () => {
    const { wrapper, renderAt } = mountNatural()

    renderAt(345.5, 123.25)
    await nextTick()

    expect(wrapper.emitted('update:w')?.at(-1)).toEqual([345.5])
    expect(wrapper.emitted('update:h')?.at(-1)).toEqual([123.25])
    expect(wrapper.emitted('resize-start')).toBeUndefined()
    expect(wrapper.emitted('resizing')).toBeUndefined()
    expect(wrapper.emitted('resize-end')).toBeUndefined()
  })

  it('stays natural after a sync, so an async image load re-syncs', async () => {
    const { wrapper, renderAt } = mountNatural()

    renderAt(100, 20)
    // The image finished loading and the element resized again.
    renderAt(640.5, 480.25)
    await nextTick()

    expect(wrapper.emitted('update:w')?.at(-1)).toEqual([640.5])
    expect(wrapper.emitted('update:h')?.at(-1)).toEqual([480.25])
  })

  it('renders no inline size while natural', async () => {
    const { wrapper, renderAt } = mountNatural()

    renderAt(345.5, 123.25)
    await nextTick()

    expect(wrapper.element.style.width).toBe('')
    expect(wrapper.element.style.height).toBe('')
  })

  it('makes a dimension explicit on an external write while the other keeps tracking', async () => {
    const { wrapper, renderAt } = mountNatural()

    await wrapper.setProps({ w: 500 })
    renderAt(500, 200.5)
    await nextTick()

    expect(wrapper.element.style.width).toBe('500px')
    expect(wrapper.element.style.height).toBe('')
    expect(wrapper.emitted('update:h')?.at(-1)).toEqual([200.5])

    // Width no longer follows the observer.
    renderAt(480, 190)
    await nextTick()
    expect(wrapper.emitted('update:w')).toBeUndefined()
    expect(wrapper.emitted('update:h')?.at(-1)).toEqual([190])
  })

  it('makes the gestured dimensions explicit, starting from a fresh measurement', async () => {
    const { wrapper, renderAt } = mountNatural()
    setMeasuredSize(wrapper.element, 345.5, 123.25)

    await dragBy(handle(wrapper, 'br'), 10, 20)

    expect(wrapper.emitted('resize-start')).toEqual([[{ x: 0, y: 0, w: 345.5, h: 123.25 }]])
    expect(wrapper.emitted('update:w')?.at(-1)).toEqual([355.5])
    expect(wrapper.emitted('update:h')?.at(-1)).toEqual([143.25])
    expect(wrapper.element.style.width).toBe('355.5px')

    // Both dimensions stopped following the observer.
    const writes = wrapper.emitted('update:w')!.length
    renderAt(999, 999)
    await nextTick()
    expect(wrapper.emitted('update:w')).toHaveLength(writes)
  })

  it('becomes natural again when a dimension is written back to 0', async () => {
    const { wrapper, renderAt } = mountNatural()
    setMeasuredSize(wrapper.element, 345.5, 123.25)

    await wrapper.setProps({ w: 500 })
    expect(wrapper.element.style.width).toBe('500px')

    await wrapper.setProps({ w: 0 })
    // Natural again: no inline size, and the rendered size is picked up right away (no observer
    // involved) — the natural one, never the stale 500px inline width.
    expect(wrapper.element.style.width).toBe('')
    expect(wrapper.emitted('update:w')).toEqual([[345.5]])

    renderAt(400, 150)
    await nextTick()
    expect(wrapper.emitted('update:w')?.at(-1)).toEqual([400])
  })

  it('picks up the rendered size once a switch to flow has re-rendered', async () => {
    const observers = stubResizeObserver()
    const wrapper = mount(DraggableResizable, { attachTo: document.body, props: {} })
    setMeasuredSize(wrapper.element, 345.5, 123.25)
    expect(wrapper.element.style.width).toBe('0px')

    await wrapper.setProps({ layout: 'flow' })
    // Measured without the absolute layout's 0px inline size, observer or not.
    expect(wrapper.emitted('update:w')).toEqual([[345.5]])
    expect(wrapper.emitted('update:h')).toEqual([[123.25]])
    expect(observers).toHaveLength(1)
  })

  it('skips the sync while the element is not rendered', async () => {
    const { wrapper, renderAt } = mountNatural()
    renderAt(345.5, 123.25)
    await nextTick()

    // `display: none` or detached: the size resolves to `auto`, which is not a number either.
    renderAt(NaN, NaN)
    await nextTick()
    expect(wrapper.emitted('update:w')).toEqual([[345.5]])
    expect(wrapper.emitted('update:h')).toEqual([[123.25]])
  })

  it('never observes in absolute mode', () => {
    const observers = stubResizeObserver()
    mount(DraggableResizable, { attachTo: document.body, props: {} })
    expect(observers).toHaveLength(0)
  })
})

/**
 * Mounts a 100x50 element inside an image-sized wrapper inside a padded 600x400 editor, whose
 * content box is 560x360.
 */
const mountWithBoundary = (props: Props = {}) => {
  const editor = document.createElement('div')
  editor.className = 'editor'
  editor.style.padding = '20px'
  setInnerSize(editor, 600, 400)
  const host = document.createElement('div')
  editor.appendChild(host)
  document.body.appendChild(editor)

  const wrapper = mount(DraggableResizable, {
    attachTo: host,
    props: { w: 100, h: 50, active: true, boundary: '.editor', ...props },
  })
  return { wrapper, editor }
}

describe('boundary', () => {
  it('caps the size at the boundary content box, resolved by selector', async () => {
    const { wrapper } = mountWithBoundary()

    await dragBy(handle(wrapper, 'br'), 1000, 1000)
    expect(wrapper.emitted('update:w')?.at(-1)).toEqual([560])
    expect(wrapper.emitted('update:h')?.at(-1)).toEqual([360])
  })

  it('accepts the element itself (or a getter) as the boundary', async () => {
    const editor = document.createElement('div')
    setInnerSize(editor, 600, 400)
    document.body.appendChild(editor)
    const { wrapper } = mountWithBoundary({ boundary: () => editor })

    await dragBy(handle(wrapper, 'br'), 1000, 1000)
    expect(wrapper.emitted('update:w')?.at(-1)).toEqual([600])
  })

  it('does not cap the height in flow', async () => {
    const { wrapper } = mountWithBoundary({ layout: 'flow' })

    await dragBy(handle(wrapper, 'br'), 1000, 1000)
    expect(wrapper.emitted('update:w')?.at(-1)).toEqual([560])
    expect(wrapper.emitted('update:h')?.at(-1)).toEqual([1050])
  })

  it('does not cap anything while the boundary does not resolve', async () => {
    const { wrapper } = mountWithBoundary({ boundary: '.missing' })

    await dragBy(handle(wrapper, 'br'), 1000, 1000)
    expect(wrapper.emitted('update:w')?.at(-1)).toEqual([1100])
  })

  it('applies a shrunken boundary at the next gesture, never by itself', async () => {
    const { wrapper, editor } = mountWithBoundary()

    await dragBy(handle(wrapper, 'br'), 1000, 0)
    expect(wrapper.emitted('update:w')?.at(-1)).toEqual([560])

    // The boundary shrinks to a 260px content box; the element must not move or shrink itself.
    setInnerSize(editor, 300, 400)
    await nextTick()
    expect(wrapper.emitted('update:w')?.at(-1)).toEqual([560])

    await dragBy(handle(wrapper, 'br'), 10, 0)
    expect(wrapper.emitted('update:w')?.at(-1)).toEqual([260])
  })

  it('lets minW win over a smaller cap', async () => {
    const { wrapper } = mountWithBoundary({ w: 650, minW: 600 })

    await dragBy(handle(wrapper, 'br'), -1000, 0)
    expect(wrapper.emitted('update:w')?.at(-1)).toEqual([600])
  })
})

describe('gesture hygiene', () => {
  it('emits no drag events and no model writes for a motionless press', async () => {
    const wrapper = mountElement()

    pointer(wrapper.element, 'pointerdown', 10, 10)
    pointer(document, 'pointerup', 10, 10)
    await nextTick()

    expect(wrapper.emitted('drag-start')).toBeUndefined()
    expect(wrapper.emitted('dragging')).toBeUndefined()
    expect(wrapper.emitted('drag-end')).toBeUndefined()
    expect(wrapper.emitted('update:x')).toBeUndefined()
    expect(wrapper.emitted('update:y')).toBeUndefined()
    expect(wrapper.emitted('activated')).toHaveLength(1)
  })

  it('emits no resize events and no model writes for a motionless handle press', async () => {
    const wrapper = mountElement({ active: true })

    pointer(handle(wrapper, 'br'), 'pointerdown', 10, 10)
    pointer(document, 'pointerup', 10, 10)
    await nextTick()

    expect(wrapper.emitted('resize-start')).toBeUndefined()
    expect(wrapper.emitted('resize-end')).toBeUndefined()
    expect(wrapper.emitted('update:w')).toBeUndefined()
    expect(wrapper.emitted('update:h')).toBeUndefined()
  })

  it('ignores the zero-delta move some touch stacks fire at the press', async () => {
    const wrapper = mountElement({ active: true })

    pointer(handle(wrapper, 'br'), 'pointerdown', 10, 10)
    pointer(document, 'pointermove', 10, 10)
    pointer(document, 'pointerup', 10, 10)
    await nextTick()

    expect(wrapper.emitted('resize-start')).toBeUndefined()
    expect(wrapper.emitted('resizing')).toBeUndefined()
    expect(wrapper.emitted('resize-end')).toBeUndefined()
  })

  it('emits start on the first real movement and end with the final rect', async () => {
    const wrapper = mountElement({ active: true })

    pointer(handle(wrapper, 'br'), 'pointerdown', 10, 10)
    pointer(document, 'pointermove', 10, 10)
    pointer(document, 'pointermove', 20, 30)
    pointer(document, 'pointerup', 20, 30)
    await nextTick()

    expect(wrapper.emitted('resize-start')).toEqual([[{ x: 100, y: 100, w: 100, h: 50 }]])
    expect(wrapper.emitted('resizing')).toEqual([[{ x: 100, y: 100, w: 110, h: 70 }]])
    expect(wrapper.emitted('resize-end')).toEqual([[{ x: 100, y: 100, w: 110, h: 70 }]])
  })

  it('still flips the gesture state classes on a motionless press', async () => {
    const wrapper = mountElement()

    pointer(wrapper.element, 'pointerdown', 0, 0)
    await nextTick()
    expect(wrapper.attributes('data-dragging')).toBe('true')

    pointer(document, 'pointerup', 0, 0)
    await nextTick()
    expect(wrapper.attributes('data-dragging')).toBeUndefined()
    expect(wrapper.emitted('drag-start')).toBeUndefined()
  })
})

describe('v-model', () => {
  it('follows external changes', async () => {
    const wrapper = mountElement()
    await wrapper.setProps({ x: 1, y: 2, w: 3, h: 4 })
    expect(rectOf(wrapper.element)).toEqual({ x: 1, y: 2, w: 3, h: 4 })
  })

  it('emits updates and waits for the parent when controlled', async () => {
    const onUpdateX = vi.fn()
    const wrapper = mount(DraggableResizable, {
      props: { x: 10, w: 100, h: 50, 'onUpdate:x': onUpdateX },
    })

    await dragBy(wrapper.element, 5, 0)
    expect(onUpdateX).toHaveBeenLastCalledWith(15)
    expect(rectOf(wrapper.element).x).toBe(10)

    await wrapper.setProps({ x: 15 })
    expect(rectOf(wrapper.element).x).toBe(15)
  })

  it('emits no size updates for a drag after the parent ignored a resize', async () => {
    const wrapper = mountElement({ active: true, 'onUpdate:w': () => {}, 'onUpdate:h': () => {} })

    await dragBy(handle(wrapper, 'br'), 10, 20)
    const updatesW = wrapper.emitted('update:w')?.length
    const updatesH = wrapper.emitted('update:h')?.length
    expect(updatesW).toBeGreaterThan(0)

    await dragBy(wrapper.element, 5, 5)
    expect(wrapper.emitted('update:x')?.at(-1)).toEqual([105])
    expect(wrapper.emitted('update:w')).toHaveLength(updatesW!)
    expect(wrapper.emitted('update:h')).toHaveLength(updatesH!)
  })

  it('emits activated / deactivated for external changes', async () => {
    const wrapper = mountElement()
    await wrapper.setProps({ active: true })
    await wrapper.setProps({ active: false })
    expect(wrapper.emitted('activated')).toHaveLength(1)
    expect(wrapper.emitted('deactivated')).toHaveLength(1)
  })
})

describe('parent size', () => {
  it('follows the parent resizing', async () => {
    const observers: { callback: () => void; disconnect: ReturnType<typeof vi.fn> }[] = []
    vi.stubGlobal(
      'ResizeObserver',
      class {
        disconnect = vi.fn()
        constructor(callback: () => void) {
          observers.push({ callback, disconnect: this.disconnect })
        }
        observe() {}
      },
    )

    const wrapper = mountElement({ parent: true })
    const parent = wrapper.element.parentElement!
    expect(observers).toHaveLength(1)

    pointer(wrapper.element, 'pointerdown', 0, 0)
    // The parent grows mid-gesture; only the observer can tell.
    setInnerSize(parent, 400, 300)
    observers[0]!.callback()
    pointer(document, 'pointermove', 500, 0)
    pointer(document, 'pointerup', 500, 0)
    await nextTick()
    expect(rectOf(wrapper.element).x).toBe(300)

    wrapper.unmount()
    expect(observers[0]!.disconnect).toHaveBeenCalled()
  })

  it('does not observe the parent when it is not needed', () => {
    const observe = vi.fn()
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe = observe
        disconnect() {}
      },
    )

    mountElement()
    expect(observe).not.toHaveBeenCalled()
  })
})

describe('cleanup', () => {
  it('removes every document listener on unmount, even mid-gesture', () => {
    const added = vi.spyOn(document, 'addEventListener')
    const removed = vi.spyOn(document, 'removeEventListener')

    const wrapper = mountElement()
    pointer(wrapper.element, 'pointerdown')
    wrapper.unmount()

    expect(eventTypes(added.mock.calls)).toEqual([
      'pointercancel',
      'pointerdown',
      'pointermove',
      'pointerup',
    ])
    expect(eventTypes(removed.mock.calls)).toEqual(eventTypes(added.mock.calls))
    for (const [index, [, listener]] of added.mock.calls.entries()) {
      expect(
        removed.mock.calls.some(([, other]) => other === listener),
        `listener ${index}`,
      ).toBe(true)
    }

    added.mockRestore()
    removed.mockRestore()
  })
})
