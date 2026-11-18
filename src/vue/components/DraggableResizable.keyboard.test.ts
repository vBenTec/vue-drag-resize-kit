import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { h, nextTick } from 'vue'

import { setInnerSize } from '../../test-utils'
import type { DraggableResizableProps } from '../types'
import DraggableResizable from './DraggableResizable.vue'

type Props = DraggableResizableProps & {
  x?: number
  y?: number
  w?: number
  h?: number
  active?: boolean
}

/** Mounts a 100x50 element at 100/100 inside a 300x300 parent, with keyboard interaction. */
const mountElement = (props: Props = {}, hostStyle = '') => {
  const host = document.createElement('div')
  host.style.cssText = hostStyle
  document.body.appendChild(host)
  const wrapper = mount(DraggableResizable, {
    attachTo: host,
    props: { x: 100, y: 100, w: 100, h: 50, keyboard: true, draggable: false, ...props },
  })
  setInnerSize(wrapper.element.parentElement!, 300, 300)
  return wrapper
}

type Wrapper = ReturnType<typeof mountElement>

const key = (target: EventTarget, type: 'keydown' | 'keyup', name: string, init = {}) => {
  const event = new KeyboardEvent(type, { key: name, bubbles: true, cancelable: true, ...init })
  target.dispatchEvent(event)
  return event
}

/** Presses and releases `name` on the element, `times` times. */
const press = async (wrapper: Wrapper, name: string, times = 1, init = {}) => {
  for (let i = 0; i < times; i++) {
    key(wrapper.element, 'keydown', name, init)
    key(wrapper.element, 'keyup', name, init)
    // oxlint-disable-next-line no-await-in-loop -- keys are sequential by nature
    await nextTick()
  }
}

const size = (wrapper: Wrapper) => {
  const { width, height } = (wrapper.element as HTMLElement).style
  return { w: parseFloat(width), h: parseFloat(height) }
}

const emittedTypes = (wrapper: Wrapper) =>
  Object.keys(wrapper.emitted()).filter((type) => /^(resize|drag)/.test(type))

afterEach(() => {
  document.body.innerHTML = ''
})

describe('without keyboard', () => {
  it('renders no focus or ARIA attributes, but hides the handles from assistive technology', () => {
    const wrapper = mountElement({ keyboard: undefined, draggable: true })
    for (const name of ['tabindex', 'role', 'aria-roledescription', 'aria-describedby']) {
      expect(wrapper.attributes(name)).toBeUndefined()
    }
    expect(wrapper.attributes('data-keyboard')).toBeUndefined()
    expect(wrapper.find('.vdr-sr-only').exists()).toBe(false)
    expect(wrapper.findAll('.vdr-handle').every((node) => node.attributes('aria-hidden'))).toBe(
      true,
    )
  })

  it('ignores keys', async () => {
    const wrapper = mountElement({ keyboard: undefined, active: true })
    await press(wrapper, 'ArrowRight')
    expect(size(wrapper)).toEqual({ w: 100, h: 50 })
    expect(emittedTypes(wrapper)).toEqual([])
  })
})

describe('keyboard semantics', () => {
  it('makes the element focusable and describes it', () => {
    const wrapper = mountElement()
    expect(wrapper.attributes('tabindex')).toBe('0')
    expect(wrapper.attributes('role')).toBe('group')
    expect(wrapper.attributes('aria-roledescription')).toBe('resizable')
    const description = wrapper.get('.vdr-sr-only')
    expect(wrapper.attributes('aria-describedby')).toBe(description.attributes('id'))
    expect(description.attributes('aria-live')).toBe('polite')
    expect(description.text()).toBe('100 × 50')
  })

  it('takes the role description and the size text from props', () => {
    const wrapper = mountElement({
      ariaRoleDescription: 'Bild',
      ariaSizeText: (width, height) => `${width} mal ${height} Pixel`,
    })
    expect(wrapper.attributes('aria-roledescription')).toBe('Bild')
    expect(wrapper.get('.vdr-sr-only').text()).toBe('100 mal 50 Pixel')
  })

  it('lets aria-label fall through', () => {
    const wrapper = mount(DraggableResizable, {
      props: { keyboard: true },
      attrs: { 'aria-label': 'Logo' },
    })
    expect(wrapper.attributes('aria-label')).toBe('Logo')
  })

  it('is not focusable while it can neither be resized nor moved', () => {
    const wrapper = mountElement({ resizable: false })
    expect(wrapper.attributes('tabindex')).toBeUndefined()
    expect(wrapper.attributes('role')).toBeUndefined()
  })

  it('updates the size text when a resize ends, not on every step', async () => {
    const wrapper = mountElement({ active: true })
    const description = () => wrapper.get('.vdr-sr-only').text()

    key(wrapper.element, 'keydown', 'ArrowRight')
    key(wrapper.element, 'keydown', 'ArrowRight', { repeat: true })
    await nextTick()
    expect(size(wrapper)).toEqual({ w: 102, h: 50 })
    expect(description()).toBe('100 × 50')

    key(wrapper.element, 'keyup', 'ArrowRight')
    await nextTick()
    expect(description()).toBe('102 × 50')

    await wrapper.setProps({ w: 80.6 })
    expect(description()).toBe('81 × 50')
  })
})

describe('keyboard activation', () => {
  it('activates on focus, deactivates on Escape and re-activates on Enter', async () => {
    const wrapper = mountElement()
    ;(wrapper.element as HTMLElement).focus()
    await nextTick()
    expect(wrapper.emitted('update:active')).toEqual([[true]])

    const escape = key(wrapper.element, 'keydown', 'Escape')
    await nextTick()
    expect(escape.defaultPrevented).toBe(true)
    expect(wrapper.emitted('update:active')).toEqual([[true], [false]])
    expect(document.activeElement).toBe(wrapper.element)

    // A second Escape is not the element's to handle (e.g. it closes a surrounding dialog).
    expect(key(wrapper.element, 'keydown', 'Escape').defaultPrevented).toBe(false)

    key(wrapper.element, 'keydown', 'Enter')
    await nextTick()
    expect(wrapper.emitted('update:active')).toEqual([[true], [false], [true]])
  })

  it('leaves arrow keys alone while inactive', async () => {
    const wrapper = mountElement()
    expect(key(wrapper.element, 'keydown', 'ArrowRight').defaultPrevented).toBe(false)
    expect(size(wrapper)).toEqual({ w: 100, h: 50 })
  })
})

describe('keyboard resizing', () => {
  it('resizes the right / bottom edges by the step, Shift x 10', async () => {
    const wrapper = mountElement({ active: true })
    await press(wrapper, 'ArrowRight', 3)
    expect(size(wrapper)).toEqual({ w: 103, h: 50 })
    await press(wrapper, 'ArrowLeft')
    await press(wrapper, 'ArrowDown', 2)
    await press(wrapper, 'ArrowUp')
    expect(size(wrapper)).toEqual({ w: 102, h: 51 })
    await press(wrapper, 'ArrowRight', 1, { shiftKey: true })
    expect(size(wrapper)).toEqual({ w: 112, h: 51 })

    await wrapper.setProps({ keyboardStep: 5 })
    await press(wrapper, 'ArrowDown', 1, { shiftKey: true })
    expect(size(wrapper)).toEqual({ w: 112, h: 101 })
    // Resizing never moves the element in LTR.
    expect((wrapper.element as HTMLElement).style.left).toBe('100px')
  })

  it('mirrors the width keys in RTL: ArrowLeft grows towards the left', async () => {
    const wrapper = mountElement({ active: true }, 'direction: rtl')
    await nextTick()
    await press(wrapper, 'ArrowLeft', 2)
    expect(wrapper.emitted('resize-end')!.at(-1)).toEqual([{ x: 98, y: 100, w: 102, h: 50 }])
    await press(wrapper, 'ArrowRight', 3)
    expect(wrapper.emitted('resize-end')!.at(-1)).toEqual([{ x: 101, y: 100, w: 99, h: 50 }])
    await press(wrapper, 'ArrowDown')
    expect(wrapper.emitted('resize-end')!.at(-1)).toEqual([{ x: 101, y: 100, w: 99, h: 51 }])
  })

  it('applies every constraint', async () => {
    const wrapper = mountElement({ active: true, minW: 99, maxH: 51, parent: true })
    await press(wrapper, 'ArrowLeft', 5)
    await press(wrapper, 'ArrowDown', 5)
    expect(size(wrapper)).toEqual({ w: 99, h: 51 })
    // The parent is 300 wide and the element starts at x = 100.
    await press(wrapper, 'ArrowRight', 30, { shiftKey: true })
    expect(size(wrapper)).toEqual({ w: 200, h: 51 })

    await wrapper.setProps({ disabledW: true })
    await press(wrapper, 'ArrowLeft')
    expect(size(wrapper)).toEqual({ w: 200, h: 51 })
  })

  it('keeps a locked aspect ratio for either axis', async () => {
    const wrapper = mountElement({ active: true, lockAspectRatio: true })
    await press(wrapper, 'ArrowRight', 10)
    expect(size(wrapper)).toEqual({ w: 110, h: 55 })
    await press(wrapper, 'ArrowDown', 5)
    expect(size(wrapper)).toEqual({ w: 120, h: 60 })
  })

  it('resizes to the min / max width with Home / End, End only with a cap', async () => {
    const wrapper = mountElement({ active: true, minW: 30, minH: 10, lockAspectRatio: true })
    await press(wrapper, 'Home')
    expect(size(wrapper)).toEqual({ w: 30, h: 15 })
    await press(wrapper, 'End')
    expect(size(wrapper)).toEqual({ w: 30, h: 15 })
    await wrapper.setProps({ maxW: 140 })
    await press(wrapper, 'End')
    expect(size(wrapper)).toEqual({ w: 140, h: 70 })
  })

  it('emits one resize-start and one resize-end per key sequence, never per repeat', async () => {
    const wrapper = mountElement({ active: true })
    key(wrapper.element, 'keydown', 'ArrowRight')
    key(wrapper.element, 'keydown', 'ArrowRight', { repeat: true })
    key(wrapper.element, 'keydown', 'ArrowDown')
    key(wrapper.element, 'keyup', 'ArrowRight')
    await nextTick()
    expect(wrapper.attributes('data-resizing')).toBe('br')
    expect(wrapper.emitted('resize-end')).toBeUndefined()

    key(wrapper.element, 'keydown', 'ArrowDown', { repeat: true })
    key(wrapper.element, 'keyup', 'ArrowDown')
    await nextTick()
    expect(wrapper.emitted('resize-start')).toEqual([[{ x: 100, y: 100, w: 100, h: 50 }]])
    expect(wrapper.emitted('resizing')).toHaveLength(4)
    expect(wrapper.emitted('resize-end')).toEqual([[{ x: 100, y: 100, w: 102, h: 52 }]])
    expect(wrapper.attributes('data-resizing')).toBeUndefined()
  })

  it('ends the sequence on blur and on Escape', async () => {
    const wrapper = mountElement({ active: true })
    ;(wrapper.element as HTMLElement).focus()
    key(wrapper.element, 'keydown', 'ArrowRight')
    ;(wrapper.element as HTMLElement).blur()
    await nextTick()
    expect(wrapper.emitted('resize-end')).toEqual([[{ x: 100, y: 100, w: 101, h: 50 }]])

    key(wrapper.element, 'keydown', 'ArrowRight')
    key(wrapper.element, 'keydown', 'Escape')
    await nextTick()
    expect(wrapper.emitted('resize-end')).toHaveLength(2)
    expect(wrapper.emitted('update:active')!.at(-1)).toEqual([false])
  })

  it('emits nothing for a key that changes nothing', async () => {
    const wrapper = mountElement({ active: true, minW: 100 })
    await press(wrapper, 'ArrowLeft')
    expect(emittedTypes(wrapper)).toEqual([])
  })

  it('ignores keys from focusable content and with Ctrl / Meta / Alt', async () => {
    const wrapper = mount(DraggableResizable, {
      attachTo: document.body,
      props: { w: 100, h: 50, keyboard: true, active: true },
      slots: { default: () => h('input') },
    })
    const event = key(wrapper.get('input').element, 'keydown', 'ArrowRight')
    expect(event.defaultPrevented).toBe(false)
    for (const modifier of ['ctrlKey', 'metaKey', 'altKey']) {
      expect(
        key(wrapper.element, 'keydown', 'ArrowRight', { [modifier]: true }).defaultPrevented,
      ).toBe(false)
    }
    await nextTick()
    expect(emittedTypes(wrapper)).toEqual([])
  })

  it('never interrupts a pointer gesture', async () => {
    const wrapper = mountElement({ active: true })
    const handle = wrapper.get('[data-handle="br"]').element
    handle.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, button: 0, clientX: 0 }),
    )
    await press(wrapper, 'ArrowRight')
    expect(size(wrapper)).toEqual({ w: 100, h: 50 })
    document.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1 }))
  })
})

describe('keyboard moving', () => {
  it('moves a draggable element in absolute layout by default, physically in RTL too', async () => {
    const wrapper = mountElement({ active: true, draggable: true }, 'direction: rtl')
    await nextTick()
    await press(wrapper, 'ArrowLeft', 2)
    await press(wrapper, 'ArrowDown', 1, { shiftKey: true })
    // Each press is a sequence of its own.
    expect(wrapper.emitted('drag-start')).toHaveLength(3)
    expect(wrapper.emitted('drag-end')!.at(1)).toEqual([{ x: 98, y: 100 }])
    expect(wrapper.emitted('drag-end')!.at(-1)).toEqual([{ x: 98, y: 110 }])
    expect(size(wrapper)).toEqual({ w: 100, h: 50 })
    expect(wrapper.emitted('resize-start')).toBeUndefined()
  })

  it('applies the drag constraints', async () => {
    const wrapper = mountElement({ active: true, draggable: true, parent: true, disabledY: true })
    await press(wrapper, 'ArrowRight', 30, { shiftKey: true })
    await press(wrapper, 'ArrowDown')
    expect(wrapper.emitted('drag-end')!.at(-1)).toEqual([{ x: 200, y: 100 }])
  })

  it('resizes instead with keyboardMode="resize", and in flow layout', async () => {
    const resizing = mountElement({ active: true, draggable: true, keyboardMode: 'resize' })
    await press(resizing, 'ArrowRight')
    expect(resizing.emitted('resize-end')).toEqual([[{ x: 100, y: 100, w: 101, h: 50 }]])

    const flow = mountElement({ active: true, draggable: true, layout: 'flow' })
    await press(flow, 'ArrowRight')
    expect(flow.emitted('resize-end')).toEqual([[{ x: 100, y: 100, w: 101, h: 50 }]])
  })

  it('ignores Home / End while moving', async () => {
    const wrapper = mountElement({ active: true, draggable: true })
    expect(key(wrapper.element, 'keydown', 'Home').defaultPrevented).toBe(false)
  })
})
