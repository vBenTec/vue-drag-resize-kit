import type { Direction, LogicalResizeHandle, PhysicalResizeHandle, ResizeHandle } from './types'

export const ALL_HANDLES = [
  'tl',
  'tm',
  'tr',
  'ml',
  'mr',
  'bl',
  'bm',
  'br',
] as const satisfies readonly PhysicalResizeHandle[]

export const LOGICAL_HANDLES = [
  'ts',
  'te',
  'ms',
  'me',
  'bs',
  'be',
] as const satisfies readonly LogicalResizeHandle[]

const isResizeHandle = (value: unknown): value is ResizeHandle =>
  (ALL_HANDLES as readonly unknown[]).includes(value) ||
  (LOGICAL_HANDLES as readonly unknown[]).includes(value)

/** Drops unknown and duplicate entries, keeping the given order. */
export const filterHandles = (handles: readonly unknown[] | null | undefined): ResizeHandle[] => [
  ...new Set((handles ?? []).filter(isResizeHandle)),
]

/** The physical handle a handle stands for: logical ones resolve against `direction`. */
export const resolveHandle = (handle: ResizeHandle, direction: Direction): PhysicalResizeHandle => {
  const side = handle.charAt(1)
  if (side !== 's' && side !== 'e') return handle as PhysicalResizeHandle
  const left = (side === 's') === (direction === 'ltr')
  return `${handle.charAt(0)}${left ? 'l' : 'r'}` as PhysicalResizeHandle
}

/**
 * The physical handles to render for `handles`: unknown entries dropped, logical ones resolved,
 * each handle once (in the order of its first entry).
 */
export const resolveHandles = (
  handles: readonly unknown[] | null | undefined,
  direction: Direction,
): PhysicalResizeHandle[] => [
  ...new Set(filterHandles(handles).map((handle) => resolveHandle(handle, direction))),
]
