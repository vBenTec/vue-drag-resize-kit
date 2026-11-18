/** A handle at a fixed side: `t`op / `m`iddle / `b`ottom + `l`eft / `m`iddle / `r`ight. */
export type PhysicalResizeHandle = 'tl' | 'tm' | 'tr' | 'ml' | 'mr' | 'bl' | 'bm' | 'br'

/**
 * A handle on the inline-`s`tart / inline-`e`nd side (`t`op / `m`iddle / `b`ottom + `s` / `e`),
 * resolved against the text direction: `ms` is `ml` in LTR and `mr` in RTL.
 */
export type LogicalResizeHandle = 'ts' | 'te' | 'ms' | 'me' | 'bs' | 'be'

/** Identifier of a resize handle, physical or logical. */
export type ResizeHandle = PhysicalResizeHandle | LogicalResizeHandle

/** Text direction, as the computed `direction` of an element. */
export type Direction = 'ltr' | 'rtl'

export interface Point {
  x: number
  y: number
}

export interface Size {
  width: number
  height: number
}

/** Position and size of an element, in px relative to its offset parent. */
export interface Rect extends Point {
  w: number
  h: number
}

/** Everything that restricts how an element may be moved or resized. */
export interface ConstraintOptions {
  disabledX?: boolean
  disabledY?: boolean
  disabledW?: boolean
  disabledH?: boolean
  minW?: number
  minH?: number
  maxW?: number
  maxH?: number
  /** Keep the element inside its parent. */
  parent?: boolean
  lockAspectRatio?: boolean
}

export interface SnapOptions {
  disabled?: boolean
  /** Snap to the edges and the centre of the parent. */
  snapToParent?: boolean
  /** Custom vertical guides (x coordinates). */
  guidesX?: readonly number[]
  /** Custom horizontal guides (y coordinates). */
  guidesY?: readonly number[]
}

/** Coordinates an element can snap to: vertical guides on `x`, horizontal guides on `y`. */
export interface Guides {
  x: number[]
  y: number[]
}
