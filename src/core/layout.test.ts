import { describe, expect, it } from 'vitest'

import { resolveLayout, type LayoutInput } from './layout'

const resolve = (input: Partial<LayoutInput>) =>
  resolveLayout({
    layout: 'absolute',
    draggable: true,
    constraints: { minW: 20, maxW: 500, maxH: 400, parent: true },
    boundary: null,
    anchoredEdge: null,
    ...input,
  })

describe('resolveLayout', () => {
  it('keeps the props in absolute layout', () => {
    expect(resolve({})).toEqual({
      positioned: true,
      draggable: true,
      constraints: { minW: 20, maxW: 500, maxH: 400, parent: true },
      resizeMode: 'anchored',
    })
  })

  it('leaves the position to the browser in flow', () => {
    const layout = resolve({ layout: 'flow' })
    expect(layout.positioned).toBe(false)
    expect(layout.draggable).toBe(false)
    expect(layout.constraints.parent).toBe(false)
    expect(layout.resizeMode).toBe('grow')
  })

  it('keeps a disabled drag disabled', () => {
    expect(resolve({ draggable: false }).draggable).toBe(false)
  })

  it('leaves the max size alone without a boundary, also in flow', () => {
    expect(resolve({ layout: 'flow' }).constraints).toMatchObject({ maxW: 500, maxH: 400 })
  })

  it('caps the max size at the boundary, only the width in flow', () => {
    const boundary = { width: 300, height: 200 }
    expect(resolve({ boundary }).constraints).toMatchObject({ maxW: 300, maxH: 200 })
    expect(resolve({ boundary, layout: 'flow' }).constraints).toMatchObject({
      maxW: 300,
      maxH: 400,
    })
    expect(resolve({ boundary, constraints: {} }).constraints).toMatchObject({
      maxW: 300,
      maxH: 200,
    })
    expect(resolve({ boundary, layout: 'flow', constraints: {} }).constraints).toMatchObject({
      maxW: 300,
      maxH: undefined,
    })
  })

  it('moves both edges for a centred flow anchor', () => {
    expect(resolve({ layout: 'flow', anchoredEdge: 'center' }).resizeMode).toBe('symmetric')
    expect(resolve({ layout: 'flow', anchoredEdge: 'left' }).resizeMode).toBe('grow')
    expect(resolve({ anchoredEdge: 'center' }).resizeMode).toBe('anchored')
  })
})
