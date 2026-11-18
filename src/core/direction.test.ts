import { describe, expect, it } from 'vitest'

import { getAnchoredEdge, isOnAnchoredEdge } from './direction'

describe('getAnchoredEdge', () => {
  it('resolves explicit anchors against the direction', () => {
    expect(getAnchoredEdge('none', 'ltr')).toBeNull()
    expect(getAnchoredEdge('start', 'ltr')).toBe('left')
    expect(getAnchoredEdge('start', 'rtl')).toBe('right')
    expect(getAnchoredEdge('end', 'ltr')).toBe('right')
    expect(getAnchoredEdge('end', 'rtl')).toBe('left')
    expect(getAnchoredEdge('center', 'rtl')).toBe('center')
  })

  it.each([
    ['start', 'left', 'right'],
    ['justify', 'left', 'right'],
    ['end', 'right', 'left'],
    ['left', 'left', 'left'],
    ['-webkit-left', 'left', 'left'],
    ['right', 'right', 'right'],
    ['-webkit-right', 'right', 'right'],
    ['center', 'center', 'center'],
    ['-webkit-center', 'center', 'center'],
    ['something-new', 'left', 'right'],
  ])('reads text-align %s as %s in LTR and %s in RTL', (textAlign, ltr, rtl) => {
    expect(getAnchoredEdge('auto', 'ltr', textAlign)).toBe(ltr)
    expect(getAnchoredEdge('auto', 'rtl', textAlign)).toBe(rtl)
  })
})

describe('isOnAnchoredEdge', () => {
  it('matches the handles in the column of the anchored edge', () => {
    expect(['tl', 'ml', 'bl', 'tm'].map((h) => isOnAnchoredEdge(h as 'tl', 'left'))).toEqual([
      true,
      true,
      true,
      false,
    ])
    expect(isOnAnchoredEdge('mr', 'right')).toBe(true)
    expect(isOnAnchoredEdge('mr', 'left')).toBe(false)
    expect(isOnAnchoredEdge('mr', 'center')).toBe(false)
    expect(isOnAnchoredEdge('ml', null)).toBe(false)
  })
})
