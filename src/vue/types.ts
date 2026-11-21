import type { EmitFn, Ref, ShallowRef, ShortEmitsToObject } from 'vue'

import type {
  ConstraintOptions,
  Direction,
  FlowAnchor,
  Guides,
  LayoutMode,
  Point,
  Rect,
  ResizeHandle,
  ResizeMode,
  Size,
} from '../core/types'

/** What the arrow keys do with `keyboard` on: move the element, or resize it. */
export type KeyboardMode = 'move' | 'resize'

/** Where the toolbar sits: below or above the element, or `auto` to flip above for lack of room. */
export type ToolbarPlacement = 'bottom' | 'top' | 'auto'

/**
 * The size `resizeTo` resizes to (px), at least one dimension. `Infinity` is the maximum allowed
 * size, `-Infinity` or `0` the minimum; `NaN` is ignored.
 */
export type ResizeToSize = { w: number; h?: number } | { w?: number; h: number }

/** Scoped props of the `toolbar` slot. */
export interface ToolbarSlotProps {
  /** The current rect (models), live during a gesture. */
  rect: Rect
  /** The running gesture, or `null`. */
  gesture: 'drag' | 'resize' | null
  /**
   * Resizes the element under the same constraints as a gesture, emitting `resize-start`,
   * `resizing` and `resize-end` once. With an effective `lockAspectRatio` the other dimension
   * follows, and `w` wins if both are given. Ignored during a gesture and while not `resizable`.
   */
  resizeTo: (size: ResizeToSize) => void
  /** Sets `active` to false. */
  deactivate: () => void
}

export interface DraggableResizableProps {
  /** Initial width (px), used when `w` / `v-model:w` is not set. */
  initW?: number
  /** Initial height (px), used when `h` / `v-model:h` is not set. */
  initH?: number
  /** How the element is positioned; see {@link LayoutMode}. @default 'absolute' */
  layout?: LayoutMode
  /** Whether the element can be dragged. Ignored with `layout="flow"`. @default true */
  draggable?: boolean
  /** Whether the element can be resized. @default true */
  resizable?: boolean
  /** Lock movement on the x-axis. */
  disabledX?: boolean
  /** Lock movement on the y-axis. */
  disabledY?: boolean
  /** Lock the width. */
  disabledW?: boolean
  /** Lock the height. */
  disabledH?: boolean
  /** Minimum width (px). @default 20 */
  minW?: number
  /** Minimum height (px). @default 20 */
  minH?: number
  /** Maximum width (px). @default Infinity */
  maxW?: number
  /** Maximum height (px). @default Infinity */
  maxH?: number
  /** Restrict movement and size to the parent element. Ignored with `layout="flow"`. */
  parent?: boolean
  /**
   * Cap the size at the content box of another element (any ancestor, or an unrelated element):
   * a CSS selector matched against the ancestors via `closest`, the element, a ref, or a getter.
   * Size-only — unlike `parent` it never constrains the position. The width cap always applies;
   * the height cap only in absolute layout (in flow, documents grow with their content).
   * Re-measured when the boundary resizes and when a gesture starts; the element never moves or
   * shrinks by itself when the boundary shrinks. `minW` / `minH` win over a smaller cap.
   */
  boundary?: BoundaryTarget
  /**
   * Resize handles to render, physical (`tl` … `br`) or logical (`ts` / `te`, `ms` / `me`,
   * `bs` / `be`: inline-start / inline-end, resolved against the computed `direction` of the
   * element when it mounts, is activated and a gesture starts). A logical handle renders as the
   * physical one it resolves to; each handle renders once. Edge handles under an effective
   * `lockAspectRatio` resize from a corner (`tm` / `ml` from the top-left, `bm` / `mr` from the
   * bottom-right one). @default the four corners while `lockAspectRatio` is in effect (set, and
   * neither `disabledW` nor `disabledH`), otherwise all eight handles
   */
  handles?: readonly ResizeHandle[]
  /**
   * With `layout="flow"`, which edge the browser keeps in place while the element resizes; see
   * {@link FlowAnchor}. On a centred line (`center`, or `auto` resolving to it) both edges move,
   * so the width changes by twice the pointer delta and the dragged handle follows the pointer.
   * `auto` is resolved when the element mounts, is activated and a gesture starts. Ignored in
   * absolute layout. @default 'none'
   */
  flowAnchor?: FlowAnchor
  /**
   * With a resolved `flowAnchor`, do not render the handles on the anchored edge, which cannot
   * follow the pointer. A `center` anchor hides none.
   */
  hideAnchoredHandles?: boolean
  /**
   * Keep the aspect ratio while resizing. In effect only while neither `disabledW` nor
   * `disabledH` is set; then the default `handles` are the four corners.
   */
  lockAspectRatio?: boolean
  /**
   * Keyboard interaction: the element is focusable (`tabindex="0"`), activates on focus and
   * deactivates on `Escape`; while active, the arrow keys move or resize it (see `keyboardMode`).
   * Also exposes it to assistive technology as a `group` with `ariaRoleDescription` and its size.
   */
  keyboard?: boolean
  /** Distance of one arrow-key step (px); `Shift` multiplies it by 10. @default 1 */
  keyboardStep?: number
  /**
   * What the arrow keys do with `keyboard`. `resize` changes the inline-end / block-end edges
   * (mirrored in RTL). @default 'move' for a draggable element in absolute layout, else 'resize'
   */
  keyboardMode?: KeyboardMode
  /** With `keyboard`, the `aria-roledescription` of the element. @default 'resizable' */
  ariaRoleDescription?: string
  /**
   * With `keyboard`, the size text exposed to assistive technology (and announced after each
   * resize). @default `${Math.round(w)} × ${Math.round(h)}`
   */
  ariaSizeText?: (w: number, h: number) => string
  /** Accessible name (`aria-label`) of the `toolbar` slot's wrapper. Pass a translation. */
  toolbarLabel?: string
  /**
   * Where the `toolbar` slot sits. `auto` is `bottom`, unless the room below — in the viewport
   * and the nearest ancestor that clips its overflow — is smaller than the toolbar and there is
   * more room above. `auto` is a snapshot: evaluated when the element is activated and when a
   * gesture ends, not on scroll. @default 'bottom'
   */
  toolbarPlacement?: ToolbarPlacement
  /**
   * A press outside the element deactivates it, unless this returns `true` for its target — e.g.
   * for teleported content opened from the toolbar: `(el) => !!el.closest('[data-popover]')`.
   */
  ignoreOutside?: (target: Element) => boolean
  /** Additional class while `draggable` is enabled. @default 'vdr-draggable' */
  classNameDraggable?: string
  /** Additional class while `resizable` is enabled. @default 'vdr-resizable' */
  classNameResizable?: string
  /** Additional class while dragging. @default 'vdr-dragging' */
  classNameDragging?: string
  /** Additional class while resizing. @default 'vdr-resizing' */
  classNameResizing?: string
  /** Additional class while active. @default 'vdr-active' */
  classNameActive?: string
  /** Additional class for each handle; also applied as `<class>-<handle>`. @default 'vdr-handle' */
  classNameHandle?: string
}

export interface DraggableContainerProps {
  /** Turn snapping off. */
  disabled?: boolean
  /** Snap to the edges and the centre of the parent. @default true */
  snapToParent?: boolean
  /** Custom vertical guides (x coordinates, px). */
  guidesX?: readonly number[]
  /** Custom horizontal guides (y coordinates, px). */
  guidesY?: readonly number[]
  /** Show the matching guides while dragging. @default true */
  showGuides?: boolean
  /** Colour of the guides. Defaults to `--vdr-guide-color`, then `#f00`. */
  guideColor?: string
}

/** Payload of `drag-start`, `dragging` and `drag-end`. */
export type DragPayload = Point

/** Payload of `resize-start`, `resizing` and `resize-end`. */
export type ResizePayload = Rect

export type DraggableResizableEmits = {
  activated: []
  deactivated: []
  'drag-start': [payload: DragPayload]
  dragging: [payload: DragPayload]
  'drag-end': [payload: DragPayload]
  'resize-start': [payload: ResizePayload]
  resizing: [payload: ResizePayload]
  'resize-end': [payload: ResizePayload]
}

/** @internal Type of the component's `emit` function, for the composables. */
export type DraggableResizableEmit = EmitFn<ShortEmitsToObject<DraggableResizableEmits>>

/** @internal What a `DraggableContainer` provides to the elements inside it. */
export interface ContainerContext {
  /**
   * Registers an element as a snap target until the calling scope is disposed. Call it during
   * setup; `getRect` is only read when another member starts a drag.
   */
  join: (getRect: () => Rect) => ContainerMember
}

/** @internal An element registered with a container. */
export interface ContainerMember {
  /** Starts snapping a drag of this member to the guides of the container and the others. */
  startSnap: (parentSize: Size | null) => SnapSession
}

/**
 * @internal One drag's access to the container's guides. Only the most recently started session
 * that has not ended can publish; it ends with the drag, when its member starts another drag or
 * when its member leaves the container.
 */
export interface SnapSession {
  /** Guides to snap to, `null` while snapping is disabled. */
  readonly guides: Guides | null
  /** Shows the guides the element is aligned with. */
  publish: (matched: Guides | null) => void
  /** Hides the matched guides. */
  end: () => void
}

/**
 * The element whose content box caps the size: a CSS selector matched against the component's
 * ancestors (via `closest`), the element itself, a ref to it, or a getter.
 */
export type BoundaryTarget =
  | string
  | HTMLElement
  | Ref<HTMLElement | null>
  | (() => HTMLElement | null)

/** @internal Options of `useGeometry`. */
export interface UseGeometryOptions {
  root: Readonly<ShallowRef<HTMLElement | null>>
  /** Flow layout: natural sizing applies and the flow anchor is resolved. */
  flow: () => boolean
  flowAnchor: () => FlowAnchor
  boundary: () => BoundaryTarget | undefined
  /** Whether the parent is measured, for `parent` bounds and snapping. */
  measureParent: () => boolean
  w: Ref<number>
  h: Ref<number>
}

/** @internal Options of `useGesture`. */
export interface UseGestureOptions {
  rect: Ref<Rect>
  /** Inner size of the parent, for `parent` bounds and snapping. */
  parentSize: Readonly<Ref<Size | null>>
  /** The text direction: `resizeTo` changes the size at the inline-end edge. */
  direction: () => Direction
  /** Re-measures the element, before a gesture begins. */
  measure: () => void
  constraints: Readonly<Ref<ConstraintOptions>>
  draggable: () => boolean
  resizable: () => boolean
  /** How a resize moves the rect. */
  resizeMode: () => ResizeMode
  /** Membership in a `DraggableContainer`, for snapping while dragging. */
  member: ContainerMember | null
  emit: DraggableResizableEmit
}

/** @internal Options of `useKeyboard`. */
export interface UseKeyboardOptions {
  /** Whether keyboard interaction is on. */
  enabled: () => boolean
  active: () => boolean
  /** Asks to activate (`Enter`) or deactivate (`Escape`) the element. */
  activate: () => void
  deactivate: () => void
  mode: () => KeyboardMode
  /** Distance of one step (px); `Shift` multiplies it by 10. */
  step: () => number
  direction: () => Direction
  /** Re-measures the element (direction, size, boundary), before a sequence starts. */
  refresh: () => void
  stepDrag: (deltaX: number, deltaY: number) => void
  stepResize: (growW: number, growH: number, handle: 'bl' | 'br') => void
  endSteps: () => void
}

/** @internal Options of `useActivation`. */
export interface UseActivationOptions {
  root: Readonly<ShallowRef<HTMLElement | null>>
  active: Ref<boolean>
  /**
   * Whether `target` is in the toolbar, which counts as part of the element for outside presses
   * and focus, but not for presses that activate it or start a gesture.
   */
  inToolbar: (target: EventTarget | null) => boolean
  /** Presses outside the element that keep it active. */
  ignoreOutside: () => ((target: Element) => boolean) | undefined
  /** Whether the element is focusable (`keyboard`): focus activates it. */
  focusable: () => boolean
  /** Runs when the element turns active, before it shows as such. */
  onActivate: () => void
  emit: DraggableResizableEmit
}

/** @internal Options of `useToolbar`. */
export interface UseToolbarOptions {
  root: Readonly<ShallowRef<HTMLElement | null>>
  /** The toolbar wrapper; `null` without the slot. */
  toolbar: Readonly<ShallowRef<HTMLElement | null>>
  active: Ref<boolean>
  placement: () => ToolbarPlacement
  /** Whether a gesture is running; `auto` is resolved again once it ends. */
  gesturing: () => boolean
  direction: () => Direction
  /** Whether the root is focusable (`keyboard`), so `Escape` can move focus back to it. */
  focusable: () => boolean
}

/** @internal Options of `useDirection`. */
export interface UseDirectionOptions {
  root: Readonly<ShallowRef<HTMLElement | null>>
  /** The anchor to resolve; `none` outside flow layout. */
  flowAnchor: () => FlowAnchor
}

/** @internal Options of `useNaturalSize`. */
export interface UseNaturalSizeOptions {
  root: Readonly<ShallowRef<HTMLElement | null>>
  /** Natural sizing only applies in flow layout. */
  enabled: () => boolean
  w: Ref<number>
  h: Ref<number>
}
