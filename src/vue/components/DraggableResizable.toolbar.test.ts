import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { h, nextTick, type VNode } from 'vue'

import {
  dragBy,
  handleOf,
  key,
  mountElement,
  pointer,
  rectOf,
  setInnerSize,
  type ElementProps,
} from '../../test-utils'
import type { ToolbarSlotProps } from '../types'
import DraggableResizable from './DraggableResizable.vue'

interface MountOptions {
  hostStyle?: string
  /** The toolbar's content; three buttons by default. */
  content?: (slot: ToolbarSlotProps) => VNode[]
}

/**
 * Mounts an active 100x50 element at 100/100 inside a 300x300 parent, with a toolbar. `slot()` is
 * the toolbar's latest scoped props.
 */
const mountToolbar = (props: ElementProps = {}, { hostStyle = '', content }: MountOptions = {}) => {
  let latest: ToolbarSlotProps | undefined
  const wrapper = mountElement({ active: true, ...props }, hostStyle, {
    toolbar: (slot: ToolbarSlotProps) => {
      latest = slot
      return (
        content?.(slot) ?? [
          h('button', { class: 'first' }, 'First'),
          h('button', { class: 'second' }, 'Second'),
          h('button', { class: 'third' }, 'Third'),
        ]
      )
    },
  })

  const toolbar = wrapper.get<HTMLElement>('.vdr-toolbar')
  const item = (name: string) => toolbar.get<HTMLElement>(`.${name}`).element
  return { wrapper, toolbar, item, slot: () => latest! }
}

const resizeEvents = (wrapper: ReturnType<typeof mountToolbar>['wrapper']) =>
  Object.keys(wrapper.emitted()).filter((type) => /^(resize|drag)/.test(type))

const focused = () => document.activeElement?.className

const press = async (target: Element) => {
  pointer(target, 'pointerdown')
  await nextTick()
}

const emittedRects = (wrapper: ReturnType<typeof mountToolbar>['wrapper']) => ({
  starts: wrapper.emitted('resize-start') ?? [],
  steps: wrapper.emitted('resizing') ?? [],
  ends: wrapper.emitted('resize-end') ?? [],
})

afterEach(() => {
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
})

describe('toolbar slot', () => {
  it('renders no wrapper without the slot', () => {
    const wrapper = mount(DraggableResizable, { props: { active: true } })
    expect(wrapper.find('.vdr-toolbar').exists()).toBe(false)
  })

  it('renders inside the root, between the content and the handles', () => {
    const { wrapper, toolbar } = mountToolbar({ keyboard: true })
    expect(toolbar.element.parentElement).toBe(wrapper.element)
    expect(toolbar.attributes('role')).toBe('toolbar')
    expect(toolbar.element.previousElementSibling?.className).toBe('vdr-sr-only')
    expect(toolbar.element.nextElementSibling?.classList.contains('vdr-handle')).toBe(true)
  })

  it('is shown only while active, and keeps its content when it hides', async () => {
    const { wrapper, toolbar, item } = mountToolbar({ active: false })
    const first = item('first')
    expect(toolbar.isVisible()).toBe(false)

    await wrapper.setProps({ active: true })
    expect(toolbar.isVisible()).toBe(true)

    await wrapper.setProps({ active: false })
    expect(toolbar.isVisible()).toBe(false)
    expect(item('first')).toBe(first)
  })

  it('stays shown during a gesture, with live scoped props', async () => {
    const { wrapper, toolbar, slot } = mountToolbar()
    expect(slot().gesture).toBeNull()
    expect(slot().rect).toEqual({ x: 100, y: 100, w: 100, h: 50 })

    pointer(handleOf(wrapper.element, 'br'), 'pointerdown', 100, 100)
    pointer(document, 'pointermove', 110, 120)
    await nextTick()
    expect(toolbar.isVisible()).toBe(true)
    expect(slot().gesture).toBe('resize')
    expect(slot().rect).toEqual({ x: 100, y: 100, w: 110, h: 70 })

    pointer(document, 'pointerup', 110, 120)
    await nextTick()
    expect(slot().gesture).toBeNull()

    pointer(wrapper.element, 'pointerdown', 100, 100)
    pointer(document, 'pointermove', 105, 100)
    await nextTick()
    expect(slot().gesture).toBe('drag')
    pointer(document, 'pointerup', 105, 100)
  })

  it('takes its accessible name from toolbarLabel, and has none by default', async () => {
    const { wrapper, toolbar } = mountToolbar()
    expect(toolbar.attributes('aria-label')).toBeUndefined()
    await wrapper.setProps({ toolbarLabel: 'Bildgröße' })
    expect(toolbar.attributes('aria-label')).toBe('Bildgröße')
  })

  it('exposes a fixed placement as data-placement', async () => {
    const { wrapper, toolbar } = mountToolbar()
    expect(toolbar.attributes('data-placement')).toBe('bottom')
    await wrapper.setProps({ toolbarPlacement: 'top' })
    expect(toolbar.attributes('data-placement')).toBe('top')
  })
})

describe('toolbar events', () => {
  it('starts no gesture for a press in the toolbar and keeps the element active', async () => {
    const { wrapper, item } = mountToolbar()
    await dragBy(item('first'), 30, 30)
    expect(resizeEvents(wrapper)).toEqual([])
    expect(rectOf(wrapper.element)).toEqual({ x: 100, y: 100, w: 100, h: 50 })
    expect(wrapper.attributes('data-active')).toBe('true')
    expect(wrapper.attributes('data-dragging')).toBeUndefined()
  })

  it('stays inactive after a toolbar click that calls deactivate()', async () => {
    const { wrapper } = mountToolbar(
      {},
      { content: ({ deactivate }) => [h('button', { class: 'close', onClick: deactivate })] },
    )
    await wrapper.get('.close').trigger('click')
    expect(wrapper.attributes('data-active')).toBeUndefined()
    expect(wrapper.emitted('deactivated')).toHaveLength(1)
    expect(wrapper.emitted('activated')).toBeUndefined()
  })

  it('still activates on a click outside the toolbar', async () => {
    const { wrapper } = mountToolbar({ active: false })
    await wrapper.trigger('click')
    expect(wrapper.attributes('data-active')).toBe('true')
  })

  it('lets a toolbar press deactivate another active element', async () => {
    const { item } = mountToolbar()
    const other = mount(DraggableResizable, { attachTo: document.body, props: { active: true } })
    await press(item('first'))
    expect(other.attributes('data-active')).toBeUndefined()
  })

  it('does not resize for keys typed in the toolbar', async () => {
    const { wrapper } = mountToolbar(
      { keyboard: true, draggable: false },
      { content: () => [h('input', { class: 'field' })] },
    )
    const field = wrapper.get('.field').element
    for (const name of ['ArrowRight', 'ArrowDown', 'End', 'Enter']) key(field, 'keydown', name)
    await nextTick()
    expect(rectOf(wrapper.element)).toMatchObject({ w: 100, h: 50 })
    expect(resizeEvents(wrapper)).toEqual([])
    expect(wrapper.attributes('data-active')).toBe('true')
  })
})

describe('Escape in the toolbar', () => {
  it('focuses the root and keeps the element active with keyboard', async () => {
    const { wrapper, item } = mountToolbar({ keyboard: true })
    item('second').focus()
    const event = key(item('second'), 'keydown', 'Escape')
    await nextTick()
    expect(document.activeElement).toBe(wrapper.element)
    expect(event.defaultPrevented).toBe(true)
    expect(wrapper.attributes('data-active')).toBe('true')
    expect(wrapper.emitted('deactivated')).toBeUndefined()
  })

  it('does nothing without keyboard', async () => {
    const { wrapper, item } = mountToolbar()
    item('second').focus()
    const event = key(item('second'), 'keydown', 'Escape')
    await nextTick()
    expect(document.activeElement).toBe(item('second'))
    expect(event.defaultPrevented).toBe(false)
    expect(wrapper.attributes('data-active')).toBe('true')
  })

  it('is skipped when the content prevented it', () => {
    const { wrapper } = mountToolbar(
      { keyboard: true },
      {
        content: () => [
          h('input', { class: 'field', onKeydown: (event: Event) => event.preventDefault() }),
        ],
      },
    )
    const field = wrapper.get<HTMLElement>('.field').element
    field.focus()
    key(field, 'keydown', 'Escape')
    expect(document.activeElement).toBe(field)
  })

  it('still deactivates on the root', async () => {
    const { wrapper } = mountToolbar({ keyboard: true })
    key(wrapper.element, 'keydown', 'Escape')
    await nextTick()
    expect(wrapper.attributes('data-active')).toBeUndefined()
  })
})

describe('arrow-key navigation', () => {
  it('moves between the items with the arrows, Home and End, wrapping around', () => {
    const { item } = mountToolbar()
    item('first').focus()

    expect(key(item('first'), 'keydown', 'ArrowRight').defaultPrevented).toBe(true)
    expect(focused()).toBe('second')
    key(item('second'), 'keydown', 'ArrowRight')
    expect(focused()).toBe('third')
    key(item('third'), 'keydown', 'ArrowRight')
    expect(focused()).toBe('first')
    key(item('first'), 'keydown', 'ArrowLeft')
    expect(focused()).toBe('third')
    key(item('third'), 'keydown', 'Home')
    expect(focused()).toBe('first')
    key(item('first'), 'keydown', 'End')
    expect(focused()).toBe('third')
  })

  it('mirrors the arrows in RTL', async () => {
    const { wrapper, item } = mountToolbar({ active: false }, { hostStyle: 'direction: rtl' })
    await wrapper.setProps({ active: true })
    item('first').focus()
    key(item('first'), 'keydown', 'ArrowLeft')
    expect(focused()).toBe('second')
    key(item('second'), 'keydown', 'ArrowRight')
    expect(focused()).toBe('first')
  })

  it('skips disabled items and picks up items that come and go', async () => {
    let extra = false
    const { wrapper, item } = mountToolbar(
      {},
      {
        content: () => [
          h('button', { class: 'first' }),
          h('button', { class: 'off', disabled: true }),
          ...(extra ? [h('button', { class: 'extra' })] : []),
          h('button', { class: 'last' }),
        ],
      },
    )
    item('first').focus()
    key(item('first'), 'keydown', 'ArrowRight')
    expect(focused()).toBe('last')

    extra = true
    wrapper.vm.$forceUpdate()
    await nextTick()
    key(item('last'), 'keydown', 'ArrowLeft')
    expect(focused()).toBe('extra')
  })

  it('leaves text fields, prevented keys and shortcuts alone', () => {
    const { item } = mountToolbar(
      {},
      {
        content: () => [
          h('input', { class: 'field' }),
          h('button', { class: 'own', onKeydown: (event: Event) => event.preventDefault() }),
          h('button', { class: 'plain' }),
        ],
      },
    )
    item('field').focus()
    expect(key(item('field'), 'keydown', 'ArrowRight').defaultPrevented).toBe(false)
    expect(key(item('field'), 'keydown', 'Home').defaultPrevented).toBe(false)
    expect(focused()).toBe('field')

    item('own').focus()
    key(item('own'), 'keydown', 'ArrowRight')
    expect(focused()).toBe('own')

    item('plain').focus()
    expect(key(item('plain'), 'keydown', 'ArrowLeft', { altKey: true }).defaultPrevented).toBe(
      false,
    )
    expect(focused()).toBe('plain')
  })

  it('never writes attributes on the items', () => {
    const { item } = mountToolbar()
    item('first').focus()
    key(item('first'), 'keydown', 'ArrowRight')
    for (const name of ['first', 'second', 'third']) {
      expect(item(name).hasAttribute('tabindex')).toBe(false)
    }
  })
})

describe('focus when the toolbar hides', () => {
  it('moves focus to the root without re-activating, with keyboard', async () => {
    const { wrapper, item, slot } = mountToolbar({ keyboard: true })
    item('first').focus()
    slot().deactivate()
    await nextTick()
    expect(document.activeElement).toBe(wrapper.element)
    expect(wrapper.attributes('data-active')).toBeUndefined()
    expect(wrapper.emitted('activated')).toBeUndefined()

    key(wrapper.element, 'keydown', 'Enter')
    await nextTick()
    expect(wrapper.attributes('data-active')).toBe('true')
  })

  it('does so when the parent sets active to false', async () => {
    const { wrapper, item } = mountToolbar({ keyboard: true })
    item('third').focus()
    await wrapper.setProps({ active: false })
    expect(document.activeElement).toBe(wrapper.element)
    expect(wrapper.attributes('data-active')).toBeUndefined()
  })

  it('leaves focus alone without keyboard, and when it is not in the toolbar', async () => {
    const { wrapper, item } = mountToolbar()
    item('first').focus()
    await wrapper.setProps({ active: false })
    expect(document.activeElement).toBe(item('first'))

    const outside = document.createElement('button')
    document.body.appendChild(outside)
    const keyboard = mountToolbar({ keyboard: true })
    outside.focus()
    await keyboard.wrapper.setProps({ active: false })
    expect(document.activeElement).toBe(outside)
  })
})

describe('ignoreOutside', () => {
  it('keeps the element active for presses it returns true for', async () => {
    const popover = document.createElement('div')
    popover.dataset.popover = ''
    popover.innerHTML = '<button></button>'
    document.body.appendChild(popover)

    const ignoreOutside = vi.fn((target: Element) => !!target.closest('[data-popover]'))
    const wrapper = mount(DraggableResizable, {
      attachTo: document.body,
      props: { active: true, ignoreOutside },
    })

    await press(popover.querySelector('button')!)
    expect(wrapper.attributes('data-active')).toBe('true')
    expect(ignoreOutside).toHaveBeenCalledWith(popover.querySelector('button'))

    await press(document.body)
    expect(wrapper.attributes('data-active')).toBeUndefined()
  })

  it('is not asked about presses inside the element, or while inactive', async () => {
    const ignoreOutside = vi.fn(() => false)
    const { wrapper, item } = mountToolbar({ ignoreOutside })
    await press(item('first'))
    await press(wrapper.element)
    expect(ignoreOutside).not.toHaveBeenCalled()

    await wrapper.setProps({ active: false })
    await press(document.body)
    expect(ignoreOutside).not.toHaveBeenCalled()
  })
})

describe('resizeTo', () => {
  it('resizes as one gesture: one event triplet with the final rect', async () => {
    const { wrapper, slot } = mountToolbar()
    slot().resizeTo({ w: 150, h: 80 })
    await nextTick()
    expect(rectOf(wrapper.element)).toEqual({ x: 100, y: 100, w: 150, h: 80 })
    expect(emittedRects(wrapper)).toEqual({
      starts: [[{ x: 100, y: 100, w: 100, h: 50 }]],
      steps: [[{ x: 100, y: 100, w: 150, h: 80 }]],
      ends: [[{ x: 100, y: 100, w: 150, h: 80 }]],
    })
    expect(wrapper.attributes('data-resizing')).toBeUndefined()
  })

  it('resizes one dimension alone without the lock', async () => {
    const { wrapper, slot } = mountToolbar()
    slot().resizeTo({ h: 80 })
    await nextTick()
    expect(rectOf(wrapper.element)).toMatchObject({ w: 100, h: 80 })
  })

  it('emits nothing when nothing changes', () => {
    const { wrapper, slot } = mountToolbar({ maxW: 100 })
    slot().resizeTo({ w: 100, h: 50 })
    slot().resizeTo({ w: 400 })
    slot().resizeTo({ w: Number.NaN })
    expect(resizeEvents(wrapper)).toEqual([])
  })

  it('honours min / max sizes and ±Infinity', async () => {
    const { wrapper, slot } = mountToolbar({ minW: 40, maxW: 180, minH: 30, maxH: 90 })
    slot().resizeTo({ w: 1000, h: 1 })
    await nextTick()
    expect(rectOf(wrapper.element)).toMatchObject({ w: 180, h: 30 })

    slot().resizeTo({ w: 0, h: Infinity })
    await nextTick()
    expect(rectOf(wrapper.element)).toMatchObject({ w: 40, h: 90 })

    slot().resizeTo({ w: Infinity, h: -Infinity })
    await nextTick()
    expect(rectOf(wrapper.element)).toMatchObject({ w: 180, h: 30 })
  })

  it('ignores Infinity without a finite maximum, and NaN', async () => {
    const { wrapper, slot } = mountToolbar()
    slot().resizeTo({ w: Infinity })
    slot().resizeTo({ w: Number.NaN, h: 70 })
    await nextTick()
    expect(rectOf(wrapper.element)).toMatchObject({ w: 100, h: 70 })
    expect(wrapper.emitted('resize-end')).toHaveLength(1)
  })

  it('lets the other dimension follow under the aspect lock, w driving', async () => {
    const { wrapper, slot } = mountToolbar({ lockAspectRatio: true })
    slot().resizeTo({ w: 160 })
    await nextTick()
    expect(rectOf(wrapper.element)).toMatchObject({ w: 160, h: 80 })

    slot().resizeTo({ h: 60 })
    await nextTick()
    expect(rectOf(wrapper.element)).toMatchObject({ w: 120, h: 60 })

    slot().resizeTo({ w: 200, h: 7 })
    await nextTick()
    expect(rectOf(wrapper.element)).toMatchObject({ w: 200, h: 100 })

    // The given width is the current one: `h` is still ignored.
    slot().resizeTo({ w: 200, h: 7 })
    await nextTick()
    expect(rectOf(wrapper.element)).toMatchObject({ w: 200, h: 100 })
  })

  it('stays inside the parent and the boundary', async () => {
    const { wrapper, slot } = mountToolbar({ parent: true, lockAspectRatio: true })
    slot().resizeTo({ w: Infinity })
    await nextTick()
    // 200px of room to the right of x = 100.
    expect(rectOf(wrapper.element)).toEqual({ x: 100, y: 100, w: 200, h: 100 })

    const bounded = mountToolbar({ boundary: () => document.body, layout: 'flow' })
    setInnerSize(document.body, 240, 1000)
    bounded.slot().resizeTo({ w: Infinity })
    await nextTick()
    expect(bounded.wrapper.element.style.width).toBe('240px')
  })

  it('honours disabledW / disabledH', async () => {
    const { wrapper, slot } = mountToolbar({ disabledW: true })
    slot().resizeTo({ w: 200, h: 80 })
    await nextTick()
    expect(rectOf(wrapper.element)).toMatchObject({ w: 100, h: 80 })
  })

  it('moves the inline-end edge: the left one in RTL', async () => {
    const { wrapper, slot } = mountToolbar({}, { hostStyle: 'direction: rtl' })
    slot().resizeTo({ w: 150 })
    await nextTick()
    expect(rectOf(wrapper.element)).toEqual({ x: 50, y: 100, w: 150, h: 50 })
  })

  it('never moves the element in flow', async () => {
    const { wrapper, slot } = mountToolbar({ layout: 'flow' }, { hostStyle: 'direction: rtl' })
    slot().resizeTo({ w: 150 })
    await nextTick()
    expect(wrapper.element.style.width).toBe('150px')
    expect(wrapper.emitted('resize-end')).toEqual([[{ x: 100, y: 100, w: 150, h: 50 }]])
  })

  it('is ignored while not resizable', () => {
    const { wrapper, slot } = mountToolbar({ resizable: false })
    slot().resizeTo({ w: 150 })
    expect(resizeEvents(wrapper)).toEqual([])
  })

  it('is ignored during a pointer gesture, which goes on', async () => {
    const { wrapper, slot } = mountToolbar()
    pointer(handleOf(wrapper.element, 'br'), 'pointerdown', 100, 100)
    slot().resizeTo({ w: 150 })
    expect(resizeEvents(wrapper)).toEqual([])

    pointer(document, 'pointermove', 110, 100)
    slot().resizeTo({ w: 150 })
    pointer(document, 'pointerup', 110, 100)
    await nextTick()
    expect(rectOf(wrapper.element)).toMatchObject({ w: 110, h: 50 })
    expect(wrapper.emitted('resize-start')).toHaveLength(1)
    expect(wrapper.emitted('resize-end')).toHaveLength(1)

    pointer(wrapper.element, 'pointerdown', 100, 100)
    pointer(document, 'pointermove', 105, 100)
    slot().resizeTo({ w: 150 })
    pointer(document, 'pointerup', 105, 100)
    await nextTick()
    expect(rectOf(wrapper.element)).toMatchObject({ x: 105, w: 110 })
  })

  it.each([
    ['resize', { draggable: false }, 'resize-end'],
    ['move', {}, 'drag-end'],
  ] as const)('is ignored during a %s key sequence, which goes on', async (_, props, end) => {
    const { wrapper, slot } = mountToolbar({ keyboard: true, ...props })
    key(wrapper.element, 'keydown', 'ArrowRight')
    slot().resizeTo({ w: 150 })
    expect(wrapper.emitted(end)).toBeUndefined()
    await nextTick()
    expect(rectOf(wrapper.element).w).not.toBe(150)

    key(wrapper.element, 'keyup', 'ArrowRight')
    expect(wrapper.emitted(end)).toHaveLength(1)
    expect(wrapper.emitted('resizing') ?? []).toHaveLength(end === 'resize-end' ? 1 : 0)
  })

  it('is exposed on the component instance', async () => {
    const wrapper = mount(DraggableResizable, { props: { w: 100, h: 50, lockAspectRatio: true } })
    wrapper.vm.resizeTo({ w: 60 })
    await nextTick()
    expect(rectOf(wrapper.element)).toMatchObject({ w: 60, h: 30 })
    expect(wrapper.emitted('resize-end')).toEqual([[{ x: 0, y: 0, w: 60, h: 30 }]])
  })
})
