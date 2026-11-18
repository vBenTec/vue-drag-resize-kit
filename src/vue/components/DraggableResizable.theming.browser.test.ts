import { afterEach, describe, expect, it } from 'vitest'
import { h, nextTick } from 'vue'

import {
  centreOf,
  fixture,
  handleOf,
  mountInto,
  screenshotPixels,
  unmountAll,
} from '../../test-utils/browser'
import type { DraggableResizableProps } from '../types'
import DraggableResizable from './DraggableResizable.vue'

afterEach(unmountAll)

const GREEN = '0,255,0'
const RED = '255,0,0'
const ALL = ['tl', 'tm', 'tr', 'ml', 'mr', 'bl', 'bm', 'br'] as const

/**
 * An active 100 x 50 element filled with pure green, with a red frame, on a white 10px margin
 * (the `stage`), themed with the given custom properties.
 */
const mountStage = async (properties = '', props: DraggableResizableProps = {}) => {
  const stage = fixture(
    `<div style="display: inline-block; padding: 10px; background: #fff; ` +
      `--vdr-border-color: #f00; ${properties}"><div class="host"></div></div>`,
  )
  mountInto(stage.querySelector('.host')!, () =>
    h(DraggableResizable, { layout: 'flow', w: 100, h: 50, active: true, ...props }, () =>
      h('div', { style: 'width: 100%; height: 100%; background: #0f0' }),
    ),
  )
  await nextTick()
  return { stage, root: stage.querySelector<HTMLElement>('.vdr-container')! }
}

/** Where the centre of the frame line is expected for each handle, relative to the viewport. */
const frameLineCentre = (root: HTMLElement, outside: number, handle: string) => {
  const rect = root.getBoundingClientRect()
  const x = { l: rect.left - outside, m: rect.left + rect.width / 2, r: rect.right + outside }
  const y = { t: rect.top - outside, m: rect.top + rect.height / 2, b: rect.bottom + outside }
  return { x: x[handle.charAt(1) as 'l'], y: y[handle.charAt(0) as 't'] }
}

const expectHandlesCentredOn = (root: HTMLElement, outside: number) => {
  for (const name of ALL) {
    const centre = centreOf(handleOf(root, name))
    const expected = frameLineCentre(root, outside, name)
    expect(centre.x, name).toBeCloseTo(expected.x, 3)
    expect(centre.y, name).toBeCloseTo(expected.y, 3)
  }
}

describe('default theme (pixel-identical to 1.1)', () => {
  it('draws the frame inside the content and the handles at their 1.1 offsets', async () => {
    const { root } = await mountStage()
    const style = getComputedStyle(root)
    expect(style.outlineStyle).toBe('dashed')
    expect(style.outlineWidth).toBe('1px')
    expect(style.outlineOffset).toBe('-1px')

    const handle = handleOf(root, 'tl')
    const handleStyle = getComputedStyle(handle)
    expect([handleStyle.top, handleStyle.left]).toEqual(['-4px', '-4px'])
    expect(handleStyle.borderTopWidth).toBe('1px')
    expect(handleStyle.borderTopLeftRadius).toBe('0px')
    expect(handleStyle.boxShadow).toBe('none')
    expect(handle.getBoundingClientRect()).toMatchObject({ width: 7, height: 7 })
    // `(size + border width) / 2` outside, as in 1.1 — the frame line's centre is 0.5px inside.
    expectHandlesCentredOn(root, 0.5)

    // The frame covers the outermost content pixels.
    const pixels = await screenshotPixels((await mountStage('', { handles: [] })).stage)
    expect(pixels.coloursIn(10, 10, 100, 1)).toContain(RED)
  })

  it('keeps the 1.1 handle offsets for other border widths and handle sizes', async () => {
    const { root } = await mountStage('--vdr-border-width: 3px; --vdr-handle-size: 10px')
    const handleStyle = getComputedStyle(handleOf(root, 'br'))
    expect([handleStyle.bottom, handleStyle.right]).toEqual(['-6.5px', '-6.5px'])
    expect(getComputedStyle(root).outlineOffset).toBe('-3px')
  })
})

describe('--vdr-border-offset', () => {
  it.each(['0', '0px'])(
    '%s draws the frame entirely outside the content, handles centred on it',
    async (offset) => {
      const { root } = await mountStage(`--vdr-border-offset: ${offset}`)
      expect(getComputedStyle(root).outlineOffset).toBe('0px')
      expectHandlesCentredOn(root, 0.5)

      const { stage } = await mountStage(`--vdr-border-offset: ${offset}`, { handles: [] })
      const pixels = await screenshotPixels(stage)
      expect(pixels.scale).toBe(1)
      // Not a single content pixel is covered…
      expect(pixels.coloursIn(10, 10, 100, 50)).toEqual([GREEN])
      // …the dashed line runs in the pixel rows / columns right outside.
      for (const [x, y, width, height] of [
        [10, 9, 100, 1],
        [10, 60, 100, 1],
        [9, 10, 1, 50],
        [110, 10, 1, 50],
      ] as const) {
        expect(pixels.coloursIn(x, y, width, height)).toContain(RED)
      }
      expect(pixels.coloursIn(10, 8, 100, 1)).toEqual(['255,255,255'])
    },
  )

  it('centres the handles on wider and further offset frames', async () => {
    const { root } = await mountStage('--vdr-border-offset: 2px; --vdr-border-width: 3px')
    expectHandlesCentredOn(root, 2 + 1.5)
  })

  it('centres the handles when set to the default explicitly', async () => {
    const { root } = await mountStage(
      '--vdr-border-offset: calc(-1 * var(--vdr-border-width, 1px))',
    )
    expect(getComputedStyle(root).outlineOffset).toBe('-1px')
    expectHandlesCentredOn(root, -0.5)
  })
})

describe('handle theming', () => {
  // The recipe from the README.
  const gmail =
    '--vdr-border-offset: 0; --vdr-handle-size: 10px; --vdr-handle-background: #4f46e5; ' +
    '--vdr-handle-border-color: #fff; --vdr-handle-border-width: 2px;'

  it('draws a solid handle with a 2px white border, centred on the frame', async () => {
    const { root } = await mountStage(gmail)
    const handle = handleOf(root, 'tl')
    const style = getComputedStyle(handle)
    expect(style.borderTopWidth).toBe('2px')
    expect(style.borderTopColor).toBe('rgb(255, 255, 255)')
    expect(style.backgroundColor).toBe('rgb(79, 70, 229)')
    expect(handle.getBoundingClientRect()).toMatchObject({ width: 10, height: 10 })
    expectHandlesCentredOn(root, 0.5)

    const { stage } = await mountStage(gmail, { handles: ['br'] })
    const pixels = await screenshotPixels(stage)
    const rect = handleOf(stage, 'br').getBoundingClientRect()
    const origin = stage.getBoundingClientRect()
    const left = rect.left - origin.left
    const top = rect.top - origin.top
    // Pixels in the middle of the border band are white, the inner square is solid.
    expect(pixels.at(left + 1, top + 5).join(',')).toBe('255,255,255')
    expect(pixels.at(left + 5, top + rect.height - 1).join(',')).toBe('255,255,255')
    expect(pixels.coloursIn(Math.ceil(left) + 3, Math.ceil(top) + 3, 4, 4)).toEqual(['79,70,229'])
  })

  it('applies a radius and a shadow', async () => {
    const { root } = await mountStage(
      '--vdr-handle-radius: 50%; --vdr-handle-shadow: 0 0 0 1px rgb(0 0 0 / 0.3)',
    )
    const style = getComputedStyle(handleOf(root, 'tl'))
    expect(style.borderTopLeftRadius).toBe('50%')
    expect(style.boxShadow).toBe('rgba(0, 0, 0, 0.3) 0px 0px 0px 1px')
  })

  it('lets plain consumer rules win over the new defaults, as before they existed', async () => {
    const sheet = fixture<HTMLStyleElement>(
      '<style>.my-handle { border-radius: 2px; box-shadow: 0 0 2px red }</style>',
    )
    // Inserted before the component's styles, so it only wins through specificity.
    document.head.prepend(sheet)
    try {
      const { root } = await mountStage('', { classNameHandle: 'my-handle' })
      const style = getComputedStyle(handleOf(root, 'tl'))
      expect(style.borderTopLeftRadius).toBe('2px')
      expect(style.boxShadow).toBe('rgb(255, 0, 0) 0px 0px 2px 0px')
    } finally {
      sheet.remove()
    }
  })
})
