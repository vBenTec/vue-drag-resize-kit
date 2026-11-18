import axe from 'axe-core'
import { afterEach, describe, expect, it } from 'vitest'
import { commands, userEvent } from 'vitest/browser'
import { h, nextTick, reactive } from 'vue'

import type { Rect } from '../../core/types'
import {
  centreOf,
  fixture,
  handleOf,
  mountInto,
  rendered,
  resolveColour,
  screenshotPixels,
  svgImage,
  unmountAll,
} from '../../test-utils/browser'
import type { DraggableResizableProps } from '../types'
import DraggableResizable from './DraggableResizable.vue'

declare module 'vitest/browser' {
  interface BrowserCommands {
    setForcedColors: (active: boolean) => Promise<void>
  }
}

afterEach(async () => {
  unmountAll()
  await commands.setForcedColors(false)
})

/**
 * A 200 x 100 flow image with keyboard interaction in an editor column (`paragraph` is the
 * opening tag of its paragraph), after a button to tab from. Models are controlled.
 */
const mountKeyboardImage = async (paragraph = '<p>', props: DraggableResizableProps = {}) => {
  const editor = fixture(
    `<main><button>Before</button><div class="editor" style="width: 300px">` +
      `${paragraph}<span class="host"></span></p></div></main>`,
  )
  const state = reactive({
    w: 200,
    h: 100,
    active: false,
    starts: [] as Rect[],
    steps: [] as Rect[],
    ends: [] as Rect[],
  })
  mountInto(editor.querySelector('.host')!, () =>
    h(
      DraggableResizable,
      {
        layout: 'flow',
        boundary: '.editor',
        lockAspectRatio: true,
        keyboard: true,
        'aria-label': 'Photo',
        w: state.w,
        h: state.h,
        active: state.active,
        'onUpdate:w': (value: number) => (state.w = value),
        'onUpdate:h': (value: number) => (state.h = value),
        'onUpdate:active': (value: boolean) => (state.active = value),
        'onResize-start': (rect: Rect) => state.starts.push(rect),
        onResizing: (rect: Rect) => state.steps.push(rect),
        'onResize-end': (rect: Rect) => state.ends.push(rect),
        ...props,
      },
      () =>
        h('img', {
          src: svgImage(200, 100),
          alt: 'A photo',
          style: 'display: block; width: 100%; height: 100%',
        }),
    ),
  )
  await nextTick()
  editor.querySelector('button')!.focus()
  return { editor, root: editor.querySelector<HTMLElement>('.vdr-container')!, state }
}

describe('keyboard resizing', () => {
  it('is reachable with Tab, which activates the element', async () => {
    const { root, state } = await mountKeyboardImage()
    await userEvent.tab()
    expect(document.activeElement).toBe(root)
    expect(state.active).toBe(true)
    expect(getComputedStyle(root).outlineStyle).toBe('dashed')
  })

  it('resizes with the arrow keys within all constraints, Shift x 10', async () => {
    const { root, state } = await mountKeyboardImage('<p>', { keyboardStep: 2 })
    await userEvent.tab()

    await userEvent.keyboard('{ArrowRight}{ArrowRight}')
    expect([state.w, state.h]).toEqual([204, 102])
    await userEvent.keyboard('{ArrowUp}')
    expect([state.w, state.h]).toEqual([200, 100])
    await userEvent.keyboard('{Shift>}{ArrowLeft}{/Shift}')
    expect([state.w, state.h]).toEqual([180, 90])

    // The boundary (the 300px editor column) caps the width, the ratio stays.
    await userEvent.keyboard('{Shift>}{ArrowRight>8/}{/Shift}')
    expect([state.w, state.h]).toEqual([300, 150])
    // minW / minH, via Home.
    await userEvent.keyboard('{Home}')
    expect([state.w, state.h]).toEqual([40, 20])
    expect(root.getBoundingClientRect().width).toBe(40)
  })

  it('mirrors the width keys in RTL', async () => {
    const { root, state } = await mountKeyboardImage('<p dir="rtl">')
    await userEvent.tab()
    const right = root.getBoundingClientRect().right
    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}')
    expect([state.w, state.h]).toEqual([202, 101])
    await userEvent.keyboard('{ArrowRight}')
    expect([state.w, state.h]).toEqual([201, 100.5])
    // The inline-end edge moved, the start edge (on the right) stayed.
    expect(root.getBoundingClientRect().right).toBe(right)
  })

  it('emits exactly one resize-start and one resize-end per key sequence', async () => {
    const { state } = await mountKeyboardImage()
    await userEvent.tab()
    // Held down: one press, four auto-repeats, one release.
    await userEvent.keyboard('{ArrowRight>5/}')
    expect(state.starts).toEqual([{ x: 0, y: 0, w: 200, h: 100 }])
    expect(state.steps).toHaveLength(5)
    expect(state.ends).toEqual([{ x: 0, y: 0, w: 205, h: 102.5 }])

    await userEvent.keyboard('{ArrowDown>}{ArrowRight}{/ArrowDown}')
    expect(state.starts).toHaveLength(2)
    expect(state.ends).toHaveLength(2)
  })

  it('deactivates on Escape, keeping focus and a visible focus frame', async () => {
    const { root, state } = await mountKeyboardImage()
    await userEvent.tab()
    await userEvent.keyboard('{Escape}')
    expect(state.active).toBe(false)
    expect(document.activeElement).toBe(root)
    expect(root.dataset.active).toBeUndefined()
    // `:focus-visible` draws the frame without activation; the handles are gone.
    expect(getComputedStyle(root).outlineStyle).toBe('dashed')
    expect(getComputedStyle(handleOf(root, 'br')).display).toBe('none')

    // Arrows do nothing while inactive; Enter re-activates.
    await userEvent.keyboard('{ArrowRight}')
    expect(state.w).toBe(200)
    await userEvent.keyboard('{Enter}')
    expect(state.active).toBe(true)
  })
})

describe('semantics', () => {
  it('hides the handles from assistive technology', async () => {
    const { root } = await mountKeyboardImage()
    const handles = [...root.querySelectorAll('.vdr-handle')]
    expect(handles).toHaveLength(8)
    for (const handle of handles) {
      expect(handle.getAttribute('aria-hidden')).toBe('true')
      expect(handle.hasAttribute('tabindex')).toBe(false)
    }
  })

  it('describes the element with its role description and size', async () => {
    const { root, state } = await mountKeyboardImage()
    expect(root.getAttribute('role')).toBe('group')
    expect(root.getAttribute('aria-roledescription')).toBe('resizable')
    expect(root.getAttribute('aria-label')).toBe('Photo')
    const description = document.getElementById(root.getAttribute('aria-describedby')!)!
    expect(description.textContent!.trim()).toBe('200 × 100')

    await userEvent.tab()
    await userEvent.keyboard('{ArrowRight>3/}')
    expect(state.w).toBe(203)
    expect(description.textContent!.trim()).toBe('203 × 102')
    // Visually hidden: it does not take any room.
    expect(description.getBoundingClientRect().width).toBeLessThanOrEqual(1)
  })

  it.each<[string, { keyboard?: boolean; focus?: boolean }]>([
    ['without keyboard', { keyboard: false }],
    ['with keyboard', {}],
    ['with keyboard, focused', { focus: true }],
  ])('passes an axe scan of an active element %s', async (_, { focus, ...props }) => {
    const { editor, root, state } = await mountKeyboardImage('<p>', props)
    state.active = true
    await nextTick()
    if (focus) root.focus()
    await rendered()
    expect(handleOf(root, 'br').checkVisibility()).toBe(true)

    const results = await axe.run(editor)
    expect(results.violations.map(({ id, nodes }) => [id, nodes.map((n) => n.html)])).toEqual([])
  })
})

describe('forced colors', () => {
  it('keeps the frame and the handles visible in system colours', async () => {
    await commands.setForcedColors(true)
    expect(matchMedia('(forced-colors: active)').matches).toBe(true)
    const stage = fixture(
      '<div style="display: inline-block; padding: 10px; --vdr-border-color: #eee; ' +
        '--vdr-handle-background: #fafafa; --vdr-handle-border-color: #eee">' +
        '<div class="host"></div></div>',
    )
    mountInto(stage.querySelector('.host')!, () =>
      h(DraggableResizable, { w: 100, h: 50, active: true, handles: ['br'], layout: 'flow' }),
    )
    await nextTick()
    const root = stage.querySelector<HTMLElement>('.vdr-container')!
    const handle = handleOf(root, 'br')

    const canvasText = resolveColour('CanvasText')
    const canvas = resolveColour('Canvas')
    expect(canvasText).not.toBe(canvas)
    expect(getComputedStyle(root).outlineColor).toBe(canvasText)
    expect(getComputedStyle(handle).borderTopColor).toBe(canvasText)
    expect(getComputedStyle(handle).backgroundColor).toBe(canvas)

    // On screen: the frame and the handle's border are drawn in CanvasText.
    const pixels = await screenshotPixels(stage)
    const ink = canvasText.match(/\d+/g)!.slice(0, 3).join(',')
    expect(pixels.coloursIn(10, 10, 80, 1)).toContain(ink)
    const rect = handle.getBoundingClientRect()
    const origin = stage.getBoundingClientRect()
    expect(pixels.at(rect.left - origin.left + 0.5, rect.top - origin.top + 3.5).join(',')).toBe(
      ink,
    )
  })
})

/** An active element with only its `tl` handle, themed with the given custom properties. */
const mountHandle = async (properties: string) => {
  const host = fixture(`<div style="padding: 40px; ${properties}"><div class="host"></div></div>`)
  mountInto(host.querySelector('.host')!, () =>
    h(DraggableResizable, { w: 100, h: 50, active: true, layout: 'flow', handles: ['tl'] }),
  )
  await nextTick()
  const handle = handleOf(host.querySelector<HTMLElement>('.vdr-container')!, 'tl')
  /**
   * The pointer target's extent through the handle's centre: the whole pixel positions that hit
   * the handle (whole pixels, as hit testing rounds fractional points).
   */
  const targetSize = () => {
    const centre = centreOf(handle)
    const x = Math.round(centre.x)
    const y = Math.round(centre.y)
    let width = 0
    let height = 0
    for (let d = -30; d <= 30; d++) {
      if (document.elementFromPoint(x + d, y) === handle) width++
      if (document.elementFromPoint(x, y + d) === handle) height++
    }
    return { width, height }
  }
  return { handle, targetSize }
}

describe('--vdr-handle-hit-size', () => {
  it('is the drawn handle by default', async () => {
    const { handle, targetSize } = await mountHandle('')
    expect(handle.getBoundingClientRect()).toMatchObject({ width: 7, height: 7 })
    expect(targetSize()).toEqual({ width: 7, height: 7 })
  })

  it('24px gives a 24 x 24 pointer target around an unchanged handle', async () => {
    const { handle, targetSize } = await mountHandle('--vdr-handle-hit-size: 24px')
    expect(handle.getBoundingClientRect()).toMatchObject({ width: 7, height: 7 })
    expect(getComputedStyle(handle).backgroundColor).toBe('rgb(240, 240, 240)')
    // Laid out as a 24 x 24 square centred on the handle (whose padding box is 5px wide)…
    const target = getComputedStyle(handle, '::before')
    expect([target.width, target.height, target.left, target.top]).toEqual([
      '24px',
      '24px',
      '-9.5px',
      '-9.5px',
    ])
    // …which the pointer hits. The edges fall on half pixels (the handle is centred on the 1px
    // frame line), so whole-pixel hit testing counts 24 or 25 positions.
    const { width, height } = targetSize()
    for (const extent of [width, height]) {
      expect(extent).toBeGreaterThanOrEqual(24)
      expect(extent).toBeLessThanOrEqual(25)
    }
  })
})
