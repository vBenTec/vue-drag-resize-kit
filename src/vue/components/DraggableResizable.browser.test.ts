import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h, nextTick, reactive, type App } from 'vue'

import type { Rect } from '../../core/types'
import { pointer, rectOf } from '../../test-utils'
import DraggableResizable from './DraggableResizable.vue'

const svgImage = (width: number, height: number) =>
  `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='${width}' ` +
  `height='${height}'><rect width='${width}' height='${height}' fill='%234f46e5'/></svg>`

let apps: App<Element>[] = []

afterEach(() => {
  for (const app of apps) app.unmount()
  apps = []
  document.body.innerHTML = ''
})

/**
 * Presses on `target`, applies each move and releases at the last position. Yields to the Vue
 * scheduler between events, as a real browser does between real pointer events — a controlled
 * parent's echo lands before the next event.
 */
const gesture = async (target: Element, moves: [number, number][]) => {
  pointer(target, 'pointerdown', 200, 200)
  let last: [number, number] = [0, 0]
  for (const [deltaX, deltaY] of moves) {
    last = [deltaX, deltaY]
    // oxlint-disable-next-line no-await-in-loop -- the moves are sequential by nature
    await nextTick()
    pointer(document, 'pointermove', 200 + deltaX, 200 + deltaY)
  }
  await nextTick()
  pointer(document, 'pointerup', 200 + last[0], 200 + last[1])
  await nextTick()
}

const handleOf = (root: HTMLElement, name: string) =>
  root.querySelector<HTMLElement>(`[data-handle="${name}"]`)!

interface FlowState {
  w: number
  h: number
  active: boolean
  resizeStarts: Rect[]
  resizeEnds: Rect[]
}

/**
 * A fake editor column (fractional width, padding, border) with a paragraph before and after and
 * a flow `DraggableResizable` between them, wrapping an image that fills the frame. The models
 * are controlled and echoed back exactly, like a persisting consumer.
 */
const mountEditorImage = async ({
  intrinsicW = 800,
  intrinsicH = 600,
  active = true,
  props = {} as Record<string, unknown>,
} = {}) => {
  const editor = document.createElement('div')
  editor.className = 'editor'
  editor.style.cssText =
    'width: 500.5px; padding: 20px; border: 1px solid #ccc; box-sizing: border-box;'
  editor.innerHTML =
    '<p class="before">Before paragraph.</p><div class="host"></div><p class="after">After.</p>'
  document.body.appendChild(editor)

  const state = reactive<FlowState>({ w: 0, h: 0, active, resizeStarts: [], resizeEnds: [] })

  const app = createApp(
    defineComponent({
      setup: () => () =>
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
            'onResize-start': (rect: Rect) => state.resizeStarts.push(rect),
            'onResize-end': (rect: Rect) => state.resizeEnds.push(rect),
            ...props,
          },
          () =>
            h('img', {
              src: svgImage(intrinsicW, intrinsicH),
              style: 'display: block; width: 100%; height: 100%;',
            }),
        ),
    }),
  )
  apps.push(app)
  app.mount(editor.querySelector('.host')!)
  await nextTick()

  const root = editor.querySelector<HTMLElement>('.vdr-container')!
  const after = editor.querySelector<HTMLElement>('.after')!
  /** The boundary cap, computed the way the library computes it. */
  const contentWidth = () => {
    const style = getComputedStyle(editor)
    return editor.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
  }
  /** Waits until natural sizing has synced the rendered size into the models. */
  const synced = () =>
    vi.waitFor(() => expect(root.getBoundingClientRect().width).toBeCloseTo(state.w, 3))

  await vi.waitFor(() => expect(state.w).toBeGreaterThan(0))
  await synced()
  return { editor, root, after, state, contentWidth, synced }
}

describe('flow layout in an editor column', () => {
  it('syncs the displayed fractional size and does not jump on activation', async () => {
    const { root, after, state } = await mountEditorImage({ active: false })

    // The 800x600 image is displayed responsive: 458.5px wide (fractional), aspect preserved.
    const displayed = root.getBoundingClientRect()
    expect(state.w).toBeCloseTo(458.5, 3)
    expect(state.h).toBeCloseTo(458.5 * (600 / 800), 3)
    expect(displayed.width).toBeCloseTo(state.w, 3)
    expect(displayed.height).toBeCloseTo(state.h, 3)

    const afterTop = after.offsetTop
    pointer(root, 'pointerdown', 200, 200)
    pointer(document, 'pointerup', 200, 200)
    await nextTick()

    // Activating neither resizes the image nor nudges the following content (outline, no border).
    expect(state.active).toBe(true)
    const activated = root.getBoundingClientRect()
    expect(activated.width).toBeCloseTo(displayed.width, 3)
    expect(activated.height).toBeCloseTo(displayed.height, 3)
    expect(after.offsetTop).toBe(afterTop)
    expect(state.resizeStarts).toHaveLength(0)
    expect(state.resizeEnds).toHaveLength(0)
  })

  it('shrinks, re-enlarges past the initial size up to the boundary, across reactivation', async () => {
    const { root, state, contentWidth } = await mountEditorImage({
      intrinsicW: 300,
      intrinsicH: 225,
    })
    expect(state.w).toBeCloseTo(300, 3)

    await gesture(handleOf(root, 'br'), [[-100, 0]])
    expect(state.w).toBeCloseTo(200, 3)
    expect(state.h).toBeCloseTo(150, 3)

    // Deactivate (pointer down outside) and reactivate.
    pointer(document.body, 'pointerdown', 5, 5)
    pointer(document, 'pointerup', 5, 5)
    await nextTick()
    expect(state.active).toBe(false)
    pointer(root, 'pointerdown', 200, 200)
    pointer(document, 'pointerup', 200, 200)
    await nextTick()
    expect(state.active).toBe(true)

    // Enlarging is capped at the editor's content width, past the initial 300px, aspect kept.
    await gesture(handleOf(root, 'br'), [[1000, 0]])
    expect(state.w).toBeCloseTo(contentWidth(), 3)
    expect(state.h).toBeCloseTo(state.w * (225 / 300), 3)
    expect(root.getBoundingClientRect().width).toBeCloseTo(state.w, 3)
  })

  it('reflows following content; tr never displaces upwards; mr / br are repeatable', async () => {
    const { root, after, state } = await mountEditorImage({ intrinsicW: 300, intrinsicH: 225 })
    const afterTop = after.offsetTop

    // Height growth pushes the following paragraph down.
    await gesture(handleOf(root, 'br'), [[100, 0]])
    expect(state.h).toBeCloseTo(300, 3)
    expect(after.offsetTop).toBeCloseTo(afterTop + 75, 0)

    // tr grows the size but keeps the flow position: the top edge never moves.
    const top = root.getBoundingClientRect().top
    const wBefore = state.w
    await gesture(handleOf(root, 'tr'), [[50, -99]])
    expect(state.w).toBeCloseTo(wBefore + 50, 3)
    expect(root.getBoundingClientRect().top).toBeCloseTo(top, 3)

    // Two consecutive mr gestures each apply their own delta (no stale offsets).
    const w1 = state.w
    await gesture(handleOf(root, 'mr'), [[-50, 0]])
    expect(state.w).toBeCloseTo(w1 - 50, 3)
    await gesture(handleOf(root, 'mr'), [[-50, 0]])
    expect(state.w).toBeCloseTo(w1 - 100, 3)
  })

  it('emits nothing for a motionless handle press, one start / end for a real gesture', async () => {
    const { root, state } = await mountEditorImage({ intrinsicW: 300, intrinsicH: 225 })

    pointer(handleOf(root, 'br'), 'pointerdown', 200, 200)
    pointer(document, 'pointerup', 200, 200)
    await nextTick()
    expect(state.resizeStarts).toHaveLength(0)
    expect(state.resizeEnds).toHaveLength(0)
    expect(state.w).toBeCloseTo(300, 3)

    await gesture(handleOf(root, 'br'), [
      [10, 0],
      [20, 0],
    ])
    expect(state.resizeStarts).toHaveLength(1)
    expect(state.resizeEnds).toHaveLength(1)
    expect(state.resizeEnds[0]!.w).toBeCloseTo(320, 3)
    expect(state.resizeEnds[0]!.h).toBeCloseTo(240, 3)
  })

  it('clamps to a changed boundary width at the next gesture', async () => {
    const { editor, root, state, contentWidth } = await mountEditorImage({
      intrinsicW: 300,
      intrinsicH: 225,
    })

    // Make the size explicit, then change the boundary while deactivated.
    await gesture(handleOf(root, 'br'), [[-100, 0]])
    expect(state.w).toBeCloseTo(200, 3)
    pointer(document.body, 'pointerdown', 5, 5)
    pointer(document, 'pointerup', 5, 5)
    await nextTick()

    editor.style.width = '180.5px'
    pointer(root, 'pointerdown', 200, 200)
    pointer(document, 'pointerup', 200, 200)
    await nextTick()
    // The element never resizes itself; the next gesture clamps to the new cap.
    expect(root.getBoundingClientRect().width).toBeCloseTo(200, 3)
    await gesture(handleOf(root, 'br'), [[1, 0]])
    expect(state.w).toBeCloseTo(contentWidth(), 3)

    // Shrinking the boundary while active is applied at the next gesture, too.
    editor.style.width = '120.5px'
    await gesture(handleOf(root, 'br'), [[1, 0]])
    expect(state.w).toBeCloseTo(contentWidth(), 3)
  })
})

describe('absolute layout regression smoke', () => {
  it('keeps default anchoring and parent clamping', async () => {
    const parent = document.createElement('div')
    parent.style.cssText = 'position: relative; width: 300px; height: 300px;'
    document.body.appendChild(parent)

    const state = reactive({ x: 100, y: 100, w: 100, h: 50 })
    const app = createApp(
      defineComponent({
        setup: () => () =>
          h(DraggableResizable, {
            parent: true,
            active: true,
            x: state.x,
            y: state.y,
            w: state.w,
            h: state.h,
            'onUpdate:x': (value: number) => (state.x = value),
            'onUpdate:y': (value: number) => (state.y = value),
            'onUpdate:w': (value: number) => (state.w = value),
            'onUpdate:h': (value: number) => (state.h = value),
          }),
      }),
    )
    apps.push(app)
    app.mount(parent)
    await nextTick()
    const root = parent.querySelector<HTMLElement>('.vdr-container')!

    // tl resizing anchors the opposite corner: the rect moves.
    await gesture(handleOf(root, 'tl'), [[10, 20]])
    expect(rectOf(root)).toEqual({ x: 110, y: 120, w: 90, h: 30 })

    // Dragging stays inside the parent.
    await gesture(root, [[500, 500]])
    expect(rectOf(root)).toEqual({ x: 210, y: 270, w: 90, h: 30 })
  })
})
