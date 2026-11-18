import { describe, expect, it } from 'vitest'

import {
  ALL_HANDLES,
  CORNER_HANDLES,
  filterHandles,
  getDefaultHandles,
  resolveHandle,
  resolveHandles,
} from './handles'

describe('filterHandles', () => {
  it('keeps valid handles in the given order', () => {
    expect(filterHandles(['br', 'tl'])).toEqual(['br', 'tl'])
    expect(filterHandles(ALL_HANDLES)).toEqual([...ALL_HANDLES])
  })

  it('drops unknown values and duplicates', () => {
    expect(filterHandles(['tl', '', 'xx', 'tl', 3, null])).toEqual(['tl'])
  })

  it('tolerates missing input', () => {
    expect(filterHandles(undefined)).toEqual([])
    expect(filterHandles(null)).toEqual([])
  })

  it('keeps logical handles', () => {
    expect(filterHandles(['te', 'me', 'be', 'ss', 'me'])).toEqual(['te', 'me', 'be'])
  })
})

describe('resolveHandle', () => {
  it.each([
    ['ts', 'tl', 'tr'],
    ['ms', 'ml', 'mr'],
    ['bs', 'bl', 'br'],
    ['te', 'tr', 'tl'],
    ['me', 'mr', 'ml'],
    ['be', 'br', 'bl'],
  ] as const)('resolves %s to %s in LTR and %s in RTL', (logical, ltr, rtl) => {
    expect(resolveHandle(logical, 'ltr')).toBe(ltr)
    expect(resolveHandle(logical, 'rtl')).toBe(rtl)
  })

  it('leaves physical handles alone', () => {
    for (const handle of ALL_HANDLES) {
      expect(resolveHandle(handle, 'ltr')).toBe(handle)
      expect(resolveHandle(handle, 'rtl')).toBe(handle)
    }
  })
})

describe('resolveHandles', () => {
  it('resolves logical handles against the direction', () => {
    expect(resolveHandles(['te', 'me', 'be'], 'ltr')).toEqual(['tr', 'mr', 'br'])
    expect(resolveHandles(['te', 'me', 'be'], 'rtl')).toEqual(['tl', 'ml', 'bl'])
  })

  it('renders a handle a logical and a physical entry resolve to once', () => {
    expect(resolveHandles(['mr', 'me', 'ms', 'tm', 'nope'], 'ltr')).toEqual(['mr', 'ml', 'tm'])
    expect(resolveHandles(['mr', 'me', 'ms'], 'rtl')).toEqual(['mr', 'ml'])
  })
})

describe('getDefaultHandles', () => {
  it('returns the corners while the aspect lock is in effect', () => {
    expect(getDefaultHandles({ lockAspectRatio: true })).toEqual(['tl', 'tr', 'bl', 'br'])
    expect(getDefaultHandles({ lockAspectRatio: true })).toBe(CORNER_HANDLES)
  })

  it('returns all eight handles otherwise', () => {
    expect(getDefaultHandles({})).toBe(ALL_HANDLES)
    expect(getDefaultHandles({ lockAspectRatio: true, disabledW: true })).toBe(ALL_HANDLES)
    expect(getDefaultHandles({ lockAspectRatio: true, disabledH: true })).toBe(ALL_HANDLES)
  })
})
