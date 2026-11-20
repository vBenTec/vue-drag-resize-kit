import { describe, expect, it } from 'vitest'

import { createGestures } from './gesture'
import type { Gesture, GesturePhase, Rect } from './types'

const start: Rect = { x: 0, y: 0, w: 100, h: 50 }
const drag: Gesture = { kind: 'drag' }
const resize: Gesture = { kind: 'resize', handle: 'br' }

/**
 * Gestures on a plain rect, recording the events as `<kind>:<phase>:<w>`, the running gesture and
 * the measurements. A measurement finds the rect at `measured`, if given.
 */
const setup = ({
  controlled = false,
  measured,
}: { controlled?: boolean; measured?: Rect } = {}) => {
  let rect = start
  let measures = 0
  const events: string[] = []
  const changes: (Gesture | null)[] = []
  const gestures = createGestures({
    measure: () => {
      measures += 1
      if (measured) rect = measured
    },
    read: () => rect,
    // A controlled model only follows once its owner re-renders, so writes do not land here.
    write: (next) => {
      if (!controlled) rect = next
    },
    emit: (phase: GesturePhase, gesture, payload) =>
      events.push(`${gesture.kind}:${phase}:${payload.w}`),
    onChange: (gesture) => changes.push(gesture),
  })
  return { gestures, events, changes, measures: () => measures }
}

const wider = (by: number) => (current: Rect) => ({ ...current, w: current.w + by })
const resized = (by: number) => (current: Rect) => ({ gesture: resize, rect: wider(by)(current) })

describe('pointer gestures', () => {
  it('runs from the press but emits start only on the first move', () => {
    const { gestures, events, changes } = setup()
    const pointer = gestures.begin(resize)!
    expect(changes).toEqual([resize])
    expect(events).toEqual([])

    pointer.move({ ...start, w: 110 })
    pointer.move({ ...start, w: 120 })
    pointer.end()
    expect(events).toEqual([
      'resize:start:100',
      'resize:move:110',
      'resize:move:120',
      'resize:end:120',
    ])
    expect(changes).toEqual([resize, null])
  })

  it('ends with the model, as its owner left it', () => {
    const { gestures, events } = setup({ controlled: true })
    const pointer = gestures.begin(resize)!
    pointer.move({ ...start, w: 110 })
    pointer.end()
    expect(events).toEqual(['resize:start:100', 'resize:move:110', 'resize:end:100'])
  })

  it('measures once at the press, before reading the start rect', () => {
    const { gestures, events, measures } = setup({ measured: { ...start, w: 80 } })
    const pointer = gestures.begin(resize)!
    pointer.move({ ...start, w: 90 })
    expect(measures()).toBe(1)
    expect(events[0]).toBe('resize:start:80')
  })

  it('emits nothing for a press without movement', () => {
    const { gestures, events } = setup()
    gestures.begin(drag)!.end()
    expect(events).toEqual([])
  })

  it('refuses a second gesture while one runs, without measuring', () => {
    const { gestures, measures } = setup()
    gestures.begin(drag)
    expect(gestures.begin(resize)).toBeNull()
    gestures.step(resize, true, wider(1))
    gestures.once(resized(1))
    expect(measures()).toBe(1)
  })

  it('cancels without an end', () => {
    const { gestures, events, changes } = setup()
    const pointer = gestures.begin(drag)!
    pointer.move({ ...start, x: 5 })
    gestures.cancel()
    pointer.end()
    expect(events).toEqual(['drag:start:100', 'drag:move:100'])
    expect(changes).toEqual([drag, null])
  })
})

describe('key sequences', () => {
  it('starts with the first step that changes the element and ends on endSteps', () => {
    const { gestures, events } = setup()
    gestures.step(resize, true, () => null)
    expect(events).toEqual([])

    gestures.step(resize, true, wider(1))
    gestures.step(resize, true, wider(1))
    gestures.endSteps()
    expect(events).toEqual([
      'resize:start:100',
      'resize:move:101',
      'resize:move:102',
      'resize:end:102',
    ])
  })

  it('measures before the step that could start the sequence, not during it', () => {
    const { gestures, events, measures } = setup({ measured: { ...start, w: 80 } })
    gestures.step(resize, true, wider(1))
    gestures.step(resize, true, wider(1))
    expect(measures()).toBe(1)
    expect(events[0]).toBe('resize:start:80')
  })

  it('ends a running sequence of the other kind first', () => {
    const { gestures, events } = setup()
    gestures.step(drag, true, (current) => ({ ...current, x: 1 }))
    gestures.step(resize, true, wider(1))
    expect(events).toEqual([
      'drag:start:100',
      'drag:move:100',
      'drag:end:100',
      'resize:start:100',
      'resize:move:101',
    ])
  })

  it('ignores a disabled step, after ending a running sequence of the other kind', () => {
    const { gestures, events, measures } = setup()
    gestures.step(drag, true, (current) => ({ ...current, x: 1 }))
    gestures.step(resize, false, wider(1))
    expect(events).toEqual(['drag:start:100', 'drag:move:100', 'drag:end:100'])
    expect(measures()).toBe(1)
  })

  it('measures after ending a running sequence of the other kind', () => {
    const order: string[] = []
    let rect = start
    const gestures = createGestures({
      measure: () => order.push('measure'),
      read: () => rect,
      write: (next) => {
        rect = next
      },
      emit: (phase, gesture) => order.push(`${gesture.kind}:${phase}`),
      onChange: () => {},
    })
    gestures.step(drag, true, (current) => ({ ...current, x: 1 }))
    gestures.step(resize, true, wider(1))
    expect(order).toEqual([
      'measure',
      'drag:start',
      'drag:move',
      'drag:end',
      'measure',
      'resize:start',
      'resize:move',
    ])
  })

  it('ignores steps during a pointer gesture, and a press during a sequence', () => {
    const { gestures, events } = setup()
    gestures.begin(drag)
    gestures.step(resize, true, wider(1))
    gestures.endSteps()
    expect(events).toEqual([])

    gestures.cancel()
    gestures.step(resize, true, wider(1))
    expect(gestures.begin(drag)).toBeNull()
  })
})

describe('one-step gestures', () => {
  it('emits start, move and end at once, with the computed rect at the end', () => {
    const { gestures, events, changes } = setup()
    gestures.once(resized(20))
    expect(events).toEqual(['resize:start:100', 'resize:move:120', 'resize:end:120'])
    expect(changes).toEqual([])
  })

  it('measures before reading the start rect and computing the target', () => {
    const { gestures, events, measures } = setup({ measured: { ...start, w: 80 } })
    gestures.once(resized(20))
    expect(measures()).toBe(1)
    expect(events).toEqual(['resize:start:80', 'resize:move:100', 'resize:end:100'])
  })

  it('ends with the computed rect, not the model, which has not followed yet', () => {
    const { gestures, events } = setup({ controlled: true })
    gestures.once(resized(20))
    expect(events).toEqual(['resize:start:100', 'resize:move:120', 'resize:end:120'])
  })

  it('emits nothing when nothing changes or a gesture runs', () => {
    const { gestures, events } = setup()
    gestures.once(() => null)
    gestures.begin(drag)
    gestures.once(resized(20))
    expect(events).toEqual([])
  })
})
