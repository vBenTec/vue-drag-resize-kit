import axe from 'axe-core'
import { afterEach, describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { h, nextTick, reactive } from 'vue'

import type { Rect } from '../../core/types'
import {
  fixture,
  mountInto,
  rendered,
  rootOf,
  svgImage,
  unmountAll,
} from '../../test-utils/browser'
import type { DraggableResizableProps, ToolbarPlacement, ToolbarSlotProps } from '../types'
import DraggableResizable from './DraggableResizable.vue'

afterEach(unmountAll)

interface ToolbarState {
  w: number
  h: number
  active: boolean
  ends: Rect[]
  clicks: number
}

/**
 * Mounts a flow image (200 x 100 intrinsic, controlled models) with a two-button toolbar into the
 * `.host` of `html`. `slot()` is the toolbar's latest scoped props.
 */
const mountToolbarImage = async (
  html: string,
  props: DraggableResizableProps = {},
  models: Partial<ToolbarState> = {},
) => {
  const stage = fixture(html)
  const state = reactive<ToolbarState>({
    w: 200,
    h: 100,
    active: true,
    ends: [],
    clicks: 0,
    ...models,
  })
  let latest: ToolbarSlotProps | undefined

  await mountInto(stage.querySelector('.host')!, () =>
    h(
      DraggableResizable,
      {
        layout: 'flow',
        lockAspectRatio: true,
        w: state.w,
        h: state.h,
        active: state.active,
        'onUpdate:w': (value: number) => (state.w = value),
        'onUpdate:h': (value: number) => (state.h = value),
        'onUpdate:active': (value: boolean) => (state.active = value),
        'onResize-end': (rect: Rect) => state.ends.push(rect),
        ...props,
      },
      {
        default: () =>
          h('img', {
            src: svgImage(200, 100),
            alt: 'A photo',
            style: 'display: block; width: 100%; height: 100%',
          }),
        toolbar: (slot: ToolbarSlotProps) => {
          latest = slot
          return [
            h('button', { class: 'small', onClick: () => state.clicks++ }, 'Small'),
            h('button', { class: 'close', onClick: slot.deactivate }, 'Close'),
          ]
        },
      },
    ),
  )
  // Post-flush effects of the mount (the `auto` placement) and the image's layout.
  await rendered()

  const root = rootOf(stage)
  const toolbar = root.querySelector<HTMLElement>('.vdr-toolbar')!
  return { stage, root, toolbar, state, slot: () => latest! }
}

const HOST = '<div><span class="host"></span></div>'

/** A 300px high clipping box with the image `top` px below its top edge. */
const clippingBox = (top: number) =>
  `<div class="box" style="height: 300px; overflow: hidden; padding-top: ${top}px; ` +
  `box-sizing: border-box"><span class="host"></span></div>`

describe('placement', () => {
  it('sits below the handles by default, aligned with the inline start', async () => {
    const { root, toolbar } = await mountToolbarImage(HOST)
    const frame = root.getBoundingClientRect()
    const box = toolbar.getBoundingClientRect()
    expect(toolbar.dataset.placement).toBe('bottom')
    // Half the frame line (0.5) + half a handle (3.5) + the 4px offset.
    expect(box.top - frame.bottom).toBeCloseTo(8, 3)
    expect(box.left).toBeCloseTo(frame.left, 3)
  })

  it('sits above with toolbar-placement="top"', async () => {
    const { root, toolbar } = await mountToolbarImage(
      `<div style="padding-top: 100px"><span class="host"></span></div>`,
      { toolbarPlacement: 'top' },
    )
    const frame = root.getBoundingClientRect()
    const box = toolbar.getBoundingClientRect()
    expect(toolbar.dataset.placement).toBe('top')
    expect(frame.top - box.bottom).toBeCloseTo(8, 3)
  })

  it('follows the frame theme and --vdr-toolbar-offset', async () => {
    const { root, toolbar } = await mountToolbarImage(
      `<div style="--vdr-border-offset: 0; --vdr-border-width: 2px; --vdr-handle-size: 10px; ` +
        `--vdr-handle-hit-size: 24px; --vdr-toolbar-offset: 6px"><span class="host"></span></div>`,
    )
    // The frame line's centre (0 + 1) + half a handle (5) + the offset (6).
    expect(toolbar.getBoundingClientRect().top - root.getBoundingClientRect().bottom).toBeCloseTo(
      12,
      3,
    )
  })

  it('aligns with the right edge in RTL', async () => {
    const { root, toolbar } = await mountToolbarImage(
      `<div dir="rtl"><span class="host"></span></div>`,
    )
    expect(toolbar.getBoundingClientRect().right).toBeCloseTo(root.getBoundingClientRect().right, 3)
  })

  it('keeps its items in a row beside a narrow element', async () => {
    const { root, toolbar } = await mountToolbarImage(HOST, {}, { w: 30, h: 15 })
    const [small, close] = [...toolbar.querySelectorAll('button')]
    expect(toolbar.offsetWidth).toBeGreaterThan(root.offsetWidth)
    expect(close!.getBoundingClientRect().top).toBe(small!.getBoundingClientRect().top)
  })

  it('paints above positioned content that follows the element', async () => {
    const { toolbar } = await mountToolbarImage(
      `<div><span class="host"></span>` +
        `<div class="later" style="position: relative; height: 80px; background: #eee"></div></div>`,
    )
    const { left, top } = toolbar.querySelector('.small')!.getBoundingClientRect()
    expect(document.elementFromPoint(left + 2, top + 2)).toBe(toolbar.querySelector('.small'))
  })
})

describe('auto placement', () => {
  it('stays below while there is room', async () => {
    const { toolbar } = await mountToolbarImage(clippingBox(20), { toolbarPlacement: 'auto' })
    expect(toolbar.dataset.placement).toBe('bottom')
  })

  it('flips above for lack of room in an ancestor that clips', async () => {
    // 300 - 190 - 100 = 10px below the image, 190px above.
    const { root, toolbar } = await mountToolbarImage(clippingBox(190), {
      toolbarPlacement: 'auto',
    })
    expect(toolbar.dataset.placement).toBe('top')
    expect(root.getBoundingClientRect().top - toolbar.getBoundingClientRect().bottom).toBeCloseTo(
      8,
      3,
    )
  })

  it('flips above at the bottom of the viewport', async () => {
    const { toolbar } = await mountToolbarImage(
      `<div style="position: fixed; bottom: 0; left: 0; font-size: 0">` +
        `<span class="host"></span></div>`,
      { toolbarPlacement: 'auto' },
    )
    expect(toolbar.dataset.placement).toBe('top')
  })

  it('stays below when there is even less room above', async () => {
    const { toolbar } = await mountToolbarImage(
      `<div class="box" style="height: 110px; overflow: hidden"><span class="host"></span></div>`,
      { toolbarPlacement: 'auto' },
    )
    expect(toolbar.dataset.placement).toBe('bottom')
  })

  it('does not treat the boundary as a clipping edge', async () => {
    const { toolbar } = await mountToolbarImage(
      `<div><p class="paragraph" style="margin: 0; font-size: 0"><span class="host"></span></p>` +
        `<div style="height: 200px"></div></div>`,
      { toolbarPlacement: 'auto', boundary: '.paragraph' },
    )
    expect(toolbar.dataset.placement).toBe('bottom')
  })

  it('is evaluated on activation', async () => {
    const { stage, toolbar, state } = await mountToolbarImage(
      clippingBox(20),
      { toolbarPlacement: 'auto' },
      { active: false },
    )
    stage.style.paddingTop = '190px'
    state.active = true
    await rendered()
    expect(toolbar.dataset.placement).toBe('top')
  })

  it('is evaluated again when a resize ends, also from resizeTo', async () => {
    const { toolbar, state, slot } = await mountToolbarImage(clippingBox(100), {
      toolbarPlacement: 'auto',
    })
    expect(toolbar.dataset.placement).toBe('bottom')

    // 300 - 100 - 190 = 10px left below.
    slot().resizeTo({ h: 190 })
    await rendered()
    expect(state.h).toBe(190)
    expect(toolbar.dataset.placement).toBe('top')

    slot().resizeTo({ h: 50 })
    await rendered()
    expect(toolbar.dataset.placement).toBe('bottom')
  })

  it('is a snapshot: scrolling does not flip it', async () => {
    const { stage, toolbar } = await mountToolbarImage(
      `<div class="box" style="height: 300px; overflow: auto"><div style="height: 20px"></div>` +
        `<span class="host"></span><div style="height: 600px"></div></div>`,
      { toolbarPlacement: 'auto' },
    )
    expect(toolbar.dataset.placement).toBe('bottom')
    stage.scrollTop = 0
    stage.style.height = '125px'
    await rendered()
    expect(toolbar.dataset.placement).toBe('bottom')
  })

  it('applies when the placement prop changes', async () => {
    // Spread in the render function, so changing it re-renders.
    const props = reactive({ toolbarPlacement: 'bottom' as ToolbarPlacement })
    const { toolbar } = await mountToolbarImage(clippingBox(190), props)
    expect(toolbar.dataset.placement).toBe('bottom')
    props.toolbarPlacement = 'auto'
    await rendered()
    expect(toolbar.dataset.placement).toBe('top')
  })
})

describe('layout', () => {
  it('does not take part in the natural size of a flow image', async () => {
    const { root, toolbar, state } = await mountToolbarImage(
      `<div style="width: 500px"><span class="host"></span></div>`,
      {},
      { w: 0, h: 0 },
    )
    expect(toolbar.offsetHeight).toBeGreaterThan(0)
    expect([state.w, state.h]).toEqual([200, 100])
    expect([root.offsetWidth, root.offsetHeight]).toEqual([200, 100])

    const plain = fixture(HOST)
    await mountInto(plain.querySelector('.host')!, () =>
      h(DraggableResizable, { layout: 'flow', active: true }, () =>
        h('img', { src: svgImage(200, 100), style: 'display: block' }),
      ),
    )
    await rendered()
    expect(rootOf(plain).getBoundingClientRect().height).toBe(root.getBoundingClientRect().height)
  })

  it('does not move the content after the element', async () => {
    const { stage, state } = await mountToolbarImage(
      `<div><span class="host"></span><p class="after" style="margin: 0">After</p></div>`,
    )
    const after = stage.querySelector('.after')!
    const top = after.getBoundingClientRect().top
    state.active = false
    await nextTick()
    expect(after.getBoundingClientRect().top).toBe(top)
  })
})

describe('interaction', () => {
  it('lets clicks reach the buttons under touch-action: none, staying active', async () => {
    const { root, toolbar, state } = await mountToolbarImage(HOST)
    expect(getComputedStyle(root).touchAction).toBe('none')
    await userEvent.click(toolbar.querySelector('.small')!)
    expect(state.clicks).toBe(1)
    expect(state.active).toBe(true)
    expect(state.ends).toEqual([])
  })

  it('deactivates from a toolbar button and stays inactive', async () => {
    const { toolbar, state } = await mountToolbarImage(HOST)
    await userEvent.click(toolbar.querySelector('.close')!)
    expect(state.active).toBe(false)
    expect(getComputedStyle(toolbar).display).toBe('none')
  })

  it('resizes to a preset within the boundary, keeping the aspect ratio', async () => {
    const { state, slot } = await mountToolbarImage(
      `<div class="editor" style="width: 300px"><span class="host"></span></div>`,
      { boundary: '.editor' },
    )
    slot().resizeTo({ w: Infinity })
    await nextTick()
    expect(state.ends).toEqual([{ x: 0, y: 0, w: 300, h: 150 }])
    expect([state.w, state.h]).toEqual([300, 150])
  })
})

describe('accessibility', () => {
  const KEYBOARD = '<main><button class="before">Before</button><span class="host"></span></main>'

  it('is a labelled toolbar without axe violations', async () => {
    const { stage, toolbar } = await mountToolbarImage(KEYBOARD, {
      keyboard: true,
      toolbarLabel: 'Image size',
      'aria-label': 'Photo',
    } as DraggableResizableProps)
    expect(toolbar.getAttribute('role')).toBe('toolbar')
    expect(toolbar.getAttribute('aria-label')).toBe('Image size')
    const { violations } = await axe.run(stage)
    expect(violations).toEqual([])
  })

  it('tabs from the root into the toolbar, and Escape returns to the frame', async () => {
    const { stage, root, toolbar, state } = await mountToolbarImage(
      KEYBOARD,
      { keyboard: true, toolbarLabel: 'Image size' },
      { active: false },
    )
    stage.querySelector<HTMLElement>('.before')!.focus()

    await userEvent.tab()
    expect(document.activeElement).toBe(root)
    expect(state.active).toBe(true)

    await userEvent.tab()
    expect(document.activeElement).toBe(toolbar.querySelector('.small'))
    await userEvent.keyboard('{ArrowRight}')
    expect(document.activeElement).toBe(toolbar.querySelector('.close'))
    expect([state.w, state.h]).toEqual([200, 100])

    await userEvent.keyboard('{Escape}')
    expect(document.activeElement).toBe(root)
    expect(state.active).toBe(true)
  })

  it('keeps focus in the element when a focused toolbar button deactivates it', async () => {
    const { root, toolbar, state } = await mountToolbarImage(KEYBOARD, { keyboard: true })
    toolbar.querySelector<HTMLElement>('.close')!.focus()
    await userEvent.keyboard('{Enter}')
    expect(state.active).toBe(false)
    expect(document.activeElement).toBe(root)

    await userEvent.keyboard('{Enter}')
    expect(state.active).toBe(true)
  })
})
