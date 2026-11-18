import { afterEach, describe, expect, it, vi } from 'vitest'
import { h, nextTick, reactive } from 'vue'

import type { Rect } from '../../core/types'
import { handleOf, pointer, rectOf } from '../../test-utils'
import {
  dragFromCentre,
  mountControlledImage,
  mountInto,
  rendered,
  rootOf,
  unmountAll,
} from '../../test-utils/browser'
import DraggableContainer from './DraggableContainer.vue'
import DraggableResizable from './DraggableResizable.vue'

afterEach(unmountAll)

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
  await mountControlledImage(editor.querySelector('.host')!, state, [intrinsicW, intrinsicH], {
    boundary: '.editor',
    'onResize-start': (rect: Rect) => state.resizeStarts.push(rect),
    'onResize-end': (rect: Rect) => state.resizeEnds.push(rect),
    ...props,
  })

  const root = rootOf(editor)
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

    await dragFromCentre(handleOf(root, 'br'), [[-100, 0]])
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
    await dragFromCentre(handleOf(root, 'br'), [[1000, 0]])
    expect(state.w).toBeCloseTo(contentWidth(), 3)
    expect(state.h).toBeCloseTo(state.w * (225 / 300), 3)
    expect(root.getBoundingClientRect().width).toBeCloseTo(state.w, 3)
  })

  it('reflows following content; tr never displaces upwards; br is repeatable', async () => {
    const { root, after, state } = await mountEditorImage({ intrinsicW: 300, intrinsicH: 225 })
    const afterTop = after.offsetTop

    // Height growth pushes the following paragraph down.
    await dragFromCentre(handleOf(root, 'br'), [[100, 0]])
    expect(state.h).toBeCloseTo(300, 3)
    expect(after.offsetTop).toBeCloseTo(afterTop + 75, 0)

    // tr grows the size but keeps the flow position: the top edge never moves.
    const top = root.getBoundingClientRect().top
    const wBefore = state.w
    await dragFromCentre(handleOf(root, 'tr'), [[50, -99]])
    expect(state.w).toBeCloseTo(wBefore + 50, 3)
    expect(root.getBoundingClientRect().top).toBeCloseTo(top, 3)

    // Two consecutive br gestures each apply their own delta (no stale offsets).
    const w1 = state.w
    await dragFromCentre(handleOf(root, 'br'), [[-50, 0]])
    expect(state.w).toBeCloseTo(w1 - 50, 3)
    await dragFromCentre(handleOf(root, 'br'), [[-50, 0]])
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

    await dragFromCentre(handleOf(root, 'br'), [
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
    await dragFromCentre(handleOf(root, 'br'), [[-100, 0]])
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
    await dragFromCentre(handleOf(root, 'br'), [[1, 0]])
    expect(state.w).toBeCloseTo(contentWidth(), 3)

    // Shrinking the boundary while active is applied at the next gesture, too.
    editor.style.width = '120.5px'
    await dragFromCentre(handleOf(root, 'br'), [[1, 0]])
    expect(state.w).toBeCloseTo(contentWidth(), 3)
  })
})

describe('natural size measurement', () => {
  it('measures in layout px under a transform: a handle press never rewrites the size', async () => {
    const { editor, root, state } = await mountEditorImage({ intrinsicW: 300, intrinsicH: 225 })
    editor.style.transform = 'scale(0.5)'
    editor.style.transformOrigin = '0 0'
    expect(root.getBoundingClientRect().width).toBeCloseTo(150, 3)

    // The press re-measures the natural size: the laid out one, not the displayed one.
    pointer(handleOf(root, 'br'), 'pointerdown', 200, 200)
    pointer(document, 'pointerup', 200, 200)
    await nextTick()
    expect(state.w).toBeCloseTo(300, 3)
    expect(state.h).toBeCloseTo(225, 3)

    await dragFromCentre(handleOf(root, 'br'), [[10, 0]])
    expect(state.resizeStarts[0]!.w).toBeCloseTo(300, 3)
    expect(state.w).toBeCloseTo(310, 3)
  })

  it('syncs the physical width / height in a vertical writing mode', async () => {
    const host = document.createElement('div')
    host.style.writingMode = 'vertical-rl'
    document.body.appendChild(host)

    const state = reactive({ w: 0, h: 0 })
    await mountInto(host, () =>
      h(
        DraggableResizable,
        {
          layout: 'flow',
          active: true,
          w: state.w,
          h: state.h,
          'onUpdate:w': (value: number) => (state.w = value),
          'onUpdate:h': (value: number) => (state.h = value),
        },
        () => h('div', { style: 'width: 300px; height: 100px;' }),
      ),
    )
    const root = rootOf(host)

    // The observer's entries are logical: inline size = height, block size = width here.
    await rendered()
    expect(state.w).toBeCloseTo(300, 3)
    expect(state.h).toBeCloseTo(100, 3)

    await dragFromCentre(handleOf(root, 'br'), [[10, 20]])
    expect(state.w).toBeCloseTo(310, 3)
    expect(state.h).toBeCloseTo(120, 3)
  })
})

describe('flow element in a DraggableContainer', () => {
  it('is a snap target where the browser placed it, not at its x / y', async () => {
    const parent = document.createElement('div')
    parent.style.cssText = 'width: 400px; height: 300px;'
    document.body.appendChild(parent)

    await mountInto(parent, () =>
      h(DraggableContainer, { snapToParent: false }, () => [
        h('p', { style: 'margin: 0; height: 40px;' }),
        h(DraggableResizable, {
          class: 'flow',
          layout: 'flow',
          w: 50,
          h: 50,
          style: 'margin-left: 120px;',
        }),
        h(DraggableResizable, { class: 'dragged', initW: 50, initH: 50 }),
      ]),
    )

    const container = parent.querySelector<HTMLElement>('.vdr-snap-container')!
    const flow = parent.querySelector<HTMLElement>('.flow')!
    const dragged = parent.querySelector<HTMLElement>('.dragged')!
    const left = flow.getBoundingClientRect().left - container.getBoundingClientRect().left
    const top = flow.getBoundingClientRect().top - container.getBoundingClientRect().top
    expect(left).toBe(120)
    expect(top).toBe(40)

    // The dragged element's right edge ends 3px before the flow element's left edge, its top 3px
    // below the flow element's bottom: both snap.
    await dragFromCentre(dragged, [[left - 53, top + 53]])
    expect(rectOf(dragged)).toEqual({ x: left - 50, y: top + 50, w: 50, h: 50 })
  })
})

describe('absolute layout regression smoke', () => {
  it('keeps default anchoring and parent clamping', async () => {
    const parent = document.createElement('div')
    parent.style.cssText = 'position: relative; width: 300px; height: 300px;'
    document.body.appendChild(parent)

    const state = reactive({ x: 100, y: 100, w: 100, h: 50 })
    await mountInto(parent, () =>
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
    )
    const root = rootOf(parent)

    // tl resizing anchors the opposite corner: the rect moves.
    await dragFromCentre(handleOf(root, 'tl'), [[10, 20]])
    expect(rectOf(root)).toEqual({ x: 110, y: 120, w: 90, h: 30 })

    // Dragging stays inside the parent.
    await dragFromCentre(root, [[500, 500]])
    expect(rectOf(root)).toEqual({ x: 210, y: 270, w: 90, h: 30 })
  })
})
