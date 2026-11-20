import { describe, expect, it } from 'vitest'

import { createGestures, type Gesture, type GesturePhase } from './gesture'
import type { Rect } from './types'

const start: Rect = { x: 0, y: 0, w: 100, h: 50 }
const drag: Gesture = { kind: 'drag' }
const resize: Gesture = { kind: 'resize', handle: 'br' }

/** Gestures on a plain rect, recording the events as `<kind>:<phase>` and the running gesture. */
const setup = ({ controlled = false } = {}) => {
  let rect = start
  const events: string[] = []
  const changes: (Gesture | null)[] = []
  const gestures = createGestures({
    read: () => rect,
    // A controlled model only follows once its owner re-renders, so writes do not land here.
    write: (next) => {
      if (!controlled) rect = next
    },
    emit: (phase: GesturePhase, gesture, payload) =>
      events.push(`${gesture.kind}:${phase}:${payload.w}`),
    onChange: (gesture) => changes.push(gesture),
  })
  return { gestures, events, changes, rect: () => rect }
}

const wider = (by: number) => (current: Rect) => ({ ...current, w: current.w + by })

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

  it('emits nothing for a press without movement', () => {
    const { gestures, events } = setup()
    gestures.begin(drag)!.end()
    expect(events).toEqual([])
  })

  it('refuses a second gesture while one runs', () => {
    const { gestures } = setup()
    gestures.begin(drag)
    expect(gestures.begin(resize)).toBeNull()
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
    gestures.step(resize, () => null)
    expect(events).toEqual([])

    gestures.step(resize, wider(1))
    gestures.step(resize, wider(1))
    gestures.endSteps()
    expect(events).toEqual([
      'resize:start:100',
      'resize:move:101',
      'resize:move:102',
      'resize:end:102',
    ])
  })

  it('tells the target whether the step would start the sequence', () => {
    const { gestures } = setup()
    const firsts: boolean[] = []
    const record = (current: Rect, first: boolean) => {
      firsts.push(first)
      return wider(1)(current)
    }
    gestures.step(resize, record)
    gestures.step(resize, record)
    expect(firsts).toEqual([true, false])
  })

  it('ends a running sequence of the other kind first', () => {
    const { gestures, events } = setup()
    gestures.step(drag, (current) => ({ ...current, x: 1 }))
    gestures.step(resize, wider(1))
    expect(events).toEqual([
      'drag:start:100',
      'drag:move:100',
      'drag:end:100',
      'resize:start:100',
      'resize:move:101',
    ])
  })

  it('ignores steps during a pointer gesture, and a press during a sequence', () => {
    const { gestures, events } = setup()
    gestures.begin(drag)
    gestures.step(resize, wider(1))
    gestures.endSteps()
    expect(events).toEqual([])

    gestures.cancel()
    gestures.step(resize, wider(1))
    expect(gestures.begin(drag)).toBeNull()
  })
})

describe('one-step gestures', () => {
  it('emits start, move and end at once, with the computed rect at the end', () => {
    const { gestures, events, changes } = setup()
    gestures.once(resize, wider(20))
    expect(events).toEqual(['resize:start:100', 'resize:move:120', 'resize:end:120'])
    expect(changes).toEqual([])
  })

  it('ends with the computed rect, not the model, which has not followed yet', () => {
    const { gestures, events } = setup({ controlled: true })
    gestures.once(resize, wider(20))
    expect(events).toEqual(['resize:start:100', 'resize:move:120', 'resize:end:120'])
  })

  it('emits nothing when nothing changes or a gesture runs', () => {
    const { gestures, events } = setup()
    gestures.once(resize, () => null)
    gestures.begin(drag)
    gestures.once(resize, wider(20))
    expect(events).toEqual([])
  })
})
