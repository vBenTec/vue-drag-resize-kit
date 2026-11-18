import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

import { pointer, setInnerSize } from '../../test-utils'
import type { DraggableResizableProps } from '../types'
import DraggableResizable from './DraggableResizable.vue'

type Props = DraggableResizableProps & {
  x?: number
  y?: number
  w?: number
  h?: number
  active?: boolean
}

/**
 * Mounts a 100x50 element into a host with the given styles (happy-dom inherits `direction` from
 * styles, not from the `dir` attribute; Chromium covers that).
 */
const mountIn = (hostStyle: string, props: Props = {}) => {
  const host = document.createElement('div')
  host.style.cssText = hostStyle
  document.body.appendChild(host)
  const wrapper = mount(DraggableResizable, {
    attachTo: host,
    props: { x: 100, y: 100, w: 100, h: 50, ...props },
  })
  setInnerSize(wrapper.element.parentElement!, 300, 300)
  return { host, wrapper }
}

const renderedHandles = (wrapper: ReturnType<typeof mount>) =>
  wrapper.findAll('.vdr-handle').map((node) => node.attributes('data-handle'))

/** Drags `handle` horizontally by `deltaX`. */
const resizeBy = async (wrapper: ReturnType<typeof mount>, handle: string, deltaX: number) => {
  pointer(wrapper.get(`[data-handle="${handle}"]`).element, 'pointerdown', 100, 100)
  pointer(document, 'pointermove', 100 + deltaX, 100)
  pointer(document, 'pointerup', 100 + deltaX, 100)
  await nextTick()
}

afterEach(() => {
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
})

describe('logical handles', () => {
  it('render as the physical handles they resolve to in LTR', () => {
    const { wrapper } = mountIn('', { handles: ['ts', 'te', 'ms', 'me', 'bs', 'be', 'tm'] })
    expect(renderedHandles(wrapper)).toEqual(['tl', 'tr', 'ml', 'mr', 'bl', 'br', 'tm'])
    expect(wrapper.get('[data-handle="mr"]').classes()).toEqual(['vdr-handle', 'vdr-handle-mr'])
  })

  it('render mirrored in RTL, once mounted', async () => {
    const { wrapper } = mountIn('direction: rtl', { handles: ['te', 'me', 'be'] })
    await nextTick()
    expect(renderedHandles(wrapper)).toEqual(['tl', 'ml', 'bl'])
  })

  it('render a handle a logical and a physical entry resolve to once', () => {
    const { wrapper } = mountIn('', { handles: ['mr', 'me', 'br'] })
    expect(renderedHandles(wrapper)).toEqual(['mr', 'br'])
  })

  it('follow a direction change once the element is activated', async () => {
    const { host, wrapper } = mountIn('', { handles: ['te', 'me', 'be'] })
    expect(renderedHandles(wrapper)).toEqual(['tr', 'mr', 'br'])

    // E.g. a `dir="auto"` paragraph turning RTL as the user types: no observer while inactive.
    host.style.direction = 'rtl'
    await nextTick()
    expect(renderedHandles(wrapper)).toEqual(['tr', 'mr', 'br'])

    pointer(wrapper.element, 'pointerdown')
    pointer(document, 'pointerup')
    await nextTick()
    expect(renderedHandles(wrapper)).toEqual(['tl', 'ml', 'bl'])
  })

  it('resize from the physical edge they render on', async () => {
    const { wrapper } = mountIn('direction: rtl', { handles: ['me'], active: true })
    await nextTick()
    await resizeBy(wrapper, 'ml', -10)
    expect(wrapper.emitted('resize-end')).toEqual([[{ x: 90, y: 100, w: 110, h: 50 }]])
    expect(wrapper.attributes('data-resizing')).toBeUndefined()
  })
})

describe('flowAnchor', () => {
  it('doubles the width change on a centred line, so the handle follows the pointer', async () => {
    const { wrapper } = mountIn('text-align: center', {
      layout: 'flow',
      flowAnchor: 'auto',
      active: true,
    })
    await resizeBy(wrapper, 'mr', 10)
    expect(wrapper.emitted('resize-end')).toEqual([[{ x: 100, y: 100, w: 120, h: 50 }]])
    await resizeBy(wrapper, 'ml', 10)
    expect(wrapper.emitted('resize-end')![1]).toEqual([{ x: 100, y: 100, w: 100, h: 50 }])
  })

  it('keeps the usual delta for start / end anchors and by default', async () => {
    for (const flowAnchor of ['start', 'end', 'none', undefined] as const) {
      const { wrapper } = mountIn('text-align: center', {
        layout: 'flow',
        flowAnchor,
        active: true,
      })
      // oxlint-disable-next-line no-await-in-loop -- one element per anchor
      await resizeBy(wrapper, 'mr', 10)
      expect(wrapper.emitted('resize-end')).toEqual([[{ x: 100, y: 100, w: 110, h: 50 }]])
      wrapper.unmount()
    }
  })

  it('is ignored in absolute layout', async () => {
    const { wrapper } = mountIn('text-align: center', {
      flowAnchor: 'center',
      hideAnchoredHandles: true,
      active: true,
    })
    await resizeBy(wrapper, 'mr', 10)
    expect(wrapper.emitted('resize-end')).toEqual([[{ x: 100, y: 100, w: 110, h: 50 }]])
  })

  it('reads the alignment of the nearest block ancestor when a gesture starts', async () => {
    const { host, wrapper } = mountIn('text-align: left', {
      layout: 'flow',
      flowAnchor: 'auto',
      active: true,
    })
    host.style.textAlign = 'center'
    await resizeBy(wrapper, 'mr', 10)
    expect(wrapper.emitted('resize-end')).toEqual([[{ x: 100, y: 100, w: 120, h: 50 }]])
  })
})

describe('hideAnchoredHandles', () => {
  it.each([
    ['', 'start', ['tm', 'tr', 'mr', 'bm', 'br']],
    ['direction: rtl', 'start', ['tl', 'tm', 'ml', 'bl', 'bm']],
    ['', 'end', ['tl', 'tm', 'ml', 'bl', 'bm']],
    ['text-align: right', 'auto', ['tl', 'tm', 'ml', 'bl', 'bm']],
    ['direction: rtl; text-align: end', 'auto', ['tm', 'tr', 'mr', 'bm', 'br']],
    ['text-align: center', 'auto', ['tl', 'tm', 'tr', 'ml', 'mr', 'bl', 'bm', 'br']],
    ['', 'none', ['tl', 'tm', 'tr', 'ml', 'mr', 'bl', 'bm', 'br']],
  ] as const)('in "%s" with %s renders %j', async (hostStyle, flowAnchor, expected) => {
    const { wrapper } = mountIn(hostStyle, {
      layout: 'flow',
      flowAnchor,
      hideAnchoredHandles: true,
    })
    await nextTick()
    expect(renderedHandles(wrapper)).toEqual(expected)
  })

  it('renders every handle without hideAnchoredHandles', async () => {
    const { wrapper } = mountIn('', { layout: 'flow', flowAnchor: 'start' })
    await nextTick()
    expect(renderedHandles(wrapper)).toHaveLength(8)
  })
})
