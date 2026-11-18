import { afterEach, describe, expect, it } from 'vitest'
import { h, nextTick, reactive } from 'vue'

import { pointer } from '../../test-utils'
import {
  centreOf,
  dragFromCentre,
  fixture,
  handleNames,
  handleOf,
  mountInto,
  svgImage,
  unmountAll,
} from '../../test-utils/browser'
import type { DraggableResizableProps } from '../types'
import DraggableResizable from './DraggableResizable.vue'

afterEach(unmountAll)

/**
 * An editor column with one paragraph (`paragraph` is its opening tag) holding a 200 x 100 flow
 * image, sized and active through controlled models — the setup Zammad measured in.
 */
const mountParagraphImage = async (paragraph: string, props: DraggableResizableProps = {}) => {
  const editor = fixture(
    `<div class="editor" style="width: 400px; padding: 16px; font: 16px/1.5 sans-serif">` +
      `${paragraph}<span class="host"></span></p></div>`,
  )
  const state = reactive({ w: 200, h: 100, active: true })
  mountInto(editor.querySelector('.host')!, () =>
    h(
      DraggableResizable,
      {
        layout: 'flow',
        boundary: '.editor',
        lockAspectRatio: true,
        w: state.w,
        h: state.h,
        active: state.active,
        'onUpdate:w': (value: number) => (state.w = value),
        'onUpdate:h': (value: number) => (state.h = value),
        'onUpdate:active': (value: boolean) => (state.active = value),
        ...props,
      },
      () =>
        h('img', { src: svgImage(200, 100), style: 'display: block; width: 100%; height: 100%' }),
    ),
  )
  await nextTick()
  const root = editor.querySelector<HTMLElement>('.vdr-container')!
  return { editor, root, state, paragraph: editor.querySelector('p')! }
}

const activate = async (root: HTMLElement) => {
  pointer(document.body, 'pointerdown', 0, 0)
  pointer(document, 'pointerup', 0, 0)
  await nextTick()
  pointer(root, 'pointerdown', 1, 1)
  pointer(document, 'pointerup', 1, 1)
  await nextTick()
}

describe('logical handles', () => {
  const zammadHandles = { handles: ['te', 'me', 'be'] } as const

  it('render on the right in an LTR paragraph', async () => {
    const { root } = await mountParagraphImage('<p>', zammadHandles)
    expect(handleNames(root)).toEqual(['tr', 'mr', 'br'])
    // Centred on the frame line, as in 1.1: half the 1px frame width outside the edge.
    expect(centreOf(handleOf(root, 'mr')).x).toBeCloseTo(
      root.getBoundingClientRect().right + 0.5,
      3,
    )
  })

  it('render on the left in an RTL paragraph', async () => {
    const { root } = await mountParagraphImage('<p dir="rtl">', zammadHandles)
    expect(handleNames(root)).toEqual(['tl', 'ml', 'bl'])
    expect(centreOf(handleOf(root, 'ml')).x).toBeCloseTo(root.getBoundingClientRect().left - 0.5, 3)
  })

  it('render on the left in a dir="auto" paragraph that resolves to RTL', async () => {
    const { root } = await mountParagraphImage('<p dir="auto">שלום עולם ', zammadHandles)
    expect(getComputedStyle(root).direction).toBe('rtl')
    expect(handleNames(root)).toEqual(['tl', 'ml', 'bl'])
  })

  it('follow a dir="auto" paragraph turning RTL as the user types, on activation', async () => {
    const { root, paragraph } = await mountParagraphImage('<p dir="auto">', zammadHandles)
    expect(handleNames(root)).toEqual(['tr', 'mr', 'br'])

    paragraph.prepend('שלום ')
    expect(getComputedStyle(root).direction).toBe('rtl')
    await activate(root)
    expect(handleNames(root)).toEqual(['tl', 'ml', 'bl'])
  })
})

describe('flow resizing with logical handles', () => {
  it.each([
    ['LTR', '<p>'],
    ['RTL', '<p dir="rtl">'],
    ['RTL text + image', '<p dir="rtl">טקסט כלשהו '],
  ])('%s: dragging "me" inwards by d shrinks by d, the handle follows', async (_, paragraph) => {
    const { root, state } = await mountParagraphImage(paragraph, { handles: ['te', 'me', 'be'] })
    const rtl = getComputedStyle(root).direction === 'rtl'
    const handle = handleOf(root, rtl ? 'ml' : 'mr')
    const anchored = root.getBoundingClientRect()[rtl ? 'right' : 'left']

    const d = 100
    const pointerAt = await dragFromCentre(handle, [[rtl ? d : -d, 0]])
    expect(state.w).toBeCloseTo(100, 3)
    expect(state.h).toBeCloseTo(50, 3)
    // The anchored edge stays, the dragged one moved with the pointer.
    expect(root.getBoundingClientRect()[rtl ? 'right' : 'left']).toBeCloseTo(anchored, 3)
    expect(Math.abs(centreOf(handle).x - pointerAt.x)).toBeLessThanOrEqual(1)
  })
})

describe('flowAnchor="auto"', () => {
  it.each([
    ['LTR', '<p style="text-align: center">Some text '],
    ['RTL', '<p dir="rtl" style="text-align: center">טקסט '],
  ])('%s centred line: the dragged handle stays under the pointer', async (_, paragraph) => {
    const { root, state } = await mountParagraphImage(paragraph, { flowAnchor: 'auto' })

    const right = handleOf(root, 'mr')
    let pointerAt = await dragFromCentre(right, [[-30, 0]])
    expect(state.w).toBeCloseTo(140, 3)
    expect(Math.abs(centreOf(right).x - pointerAt.x)).toBeLessThanOrEqual(1)

    const left = handleOf(root, 'bl')
    pointerAt = await dragFromCentre(left, [[-20, 0]])
    expect(state.w).toBeCloseTo(180, 3)
    expect(Math.abs(centreOf(left).x - pointerAt.x)).toBeLessThanOrEqual(1)
  })

  it('without it, a centred line leaves the handle behind (the 1.1 behaviour)', async () => {
    const { root, state } = await mountParagraphImage('<p style="text-align: center">')
    const right = handleOf(root, 'mr')
    const pointerAt = await dragFromCentre(right, [[-30, 0]])
    expect(state.w).toBeCloseTo(170, 3)
    expect(centreOf(right).x - pointerAt.x).toBeCloseTo(15, 0)
  })

  it.each([
    ['LTR start', '<p>', ['tm', 'tr', 'mr', 'bm', 'br']],
    ['RTL start', '<p dir="rtl">', ['tl', 'tm', 'ml', 'bl', 'bm']],
    ['LTR end', '<p style="text-align: end">', ['tl', 'tm', 'ml', 'bl', 'bm']],
    ['RTL right', '<p dir="rtl" style="text-align: right">', ['tl', 'tm', 'ml', 'bl', 'bm']],
    ['justified', '<p style="text-align: justify">', ['tm', 'tr', 'mr', 'bm', 'br']],
    ['centred', '<p style="text-align: center">', ['tl', 'tm', 'tr', 'ml', 'mr', 'bl', 'bm', 'br']],
  ])(
    '%s with hideAnchoredHandles renders only the moving edges',
    async (_, paragraph, expected) => {
      const { root } = await mountParagraphImage(paragraph, {
        flowAnchor: 'auto',
        hideAnchoredHandles: true,
      })
      expect(handleNames(root)).toEqual(expected)

      // Every remaining side handle follows the pointer.
      for (const name of ['ml', 'mr'].filter((side) => expected.includes(side))) {
        const handle = handleOf(root, name)
        // oxlint-disable-next-line no-await-in-loop -- one gesture after the other
        const pointerAt = await dragFromCentre(handle, [[name === 'mr' ? -10 : 10, 0]])
        expect(Math.abs(centreOf(handle).x - pointerAt.x)).toBeLessThanOrEqual(1)
      }
    },
  )
})
