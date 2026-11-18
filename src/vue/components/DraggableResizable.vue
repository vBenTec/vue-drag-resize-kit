<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, useId, useTemplateRef, watch } from 'vue'

import { isOnAnchoredEdge } from '../../core/direction'
import { ALL_HANDLES, resolveHandles } from '../../core/handles'
import type { ConstraintOptions, PhysicalResizeHandle, Rect } from '../../core/types'
import { useBoundarySize } from '../composables/useBoundarySize'
import { useContainerMember } from '../composables/useContainer'
import { useDirection } from '../composables/useDirection'
import { useGesture } from '../composables/useGesture'
import { useKeyboard } from '../composables/useKeyboard'
import { useNaturalSize } from '../composables/useNaturalSize'
import type { DraggableResizableEmits, DraggableResizableProps } from '../types'

const {
  layout = 'absolute',
  boundary,
  draggable = true,
  resizable = true,
  disabledX,
  disabledY,
  disabledW,
  disabledH,
  minW = 20,
  minH = 20,
  maxW,
  maxH,
  parent,
  handles = ALL_HANDLES,
  flowAnchor = 'none',
  hideAnchoredHandles,
  lockAspectRatio,
  keyboard,
  keyboardStep = 1,
  keyboardMode,
  ariaRoleDescription = 'resizable',
  ariaSizeText = (sizeW: number, sizeH: number) => `${Math.round(sizeW)} × ${Math.round(sizeH)}`,
  classNameDraggable = 'vdr-draggable',
  classNameResizable = 'vdr-resizable',
  classNameDragging = 'vdr-dragging',
  classNameResizing = 'vdr-resizing',
  classNameActive = 'vdr-active',
  classNameHandle = 'vdr-handle',
} = defineProps<DraggableResizableProps>()

const emit = defineEmits<DraggableResizableEmits>()

defineSlots<{
  default?: () => unknown
}>()

const x = defineModel<number>('x', { default: 0 })
const y = defineModel<number>('y', { default: 0 })
// Falls back to `initW` / `initH` while the size is not controlled from outside.
const w = defineModel<number>('w', {
  default: (raw: Record<string, unknown>) => (typeof raw.initW === 'number' ? raw.initW : 0),
})
const h = defineModel<number>('h', {
  default: (raw: Record<string, unknown>) => (typeof raw.initH === 'number' ? raw.initH : 0),
})
const active = defineModel<boolean>('active', { default: false })

// The four models as one value. Writing it only emits updates for the models that changed: a
// model that is written its current value would still emit if the parent ignored its last update.
const rect = computed<Rect>({
  get: () => ({ x: x.value, y: y.value, w: w.value, h: h.value }),
  set: (next) => {
    if (next.x !== x.value) x.value = next.x
    if (next.y !== y.value) y.value = next.y
    if (next.w !== w.value) w.value = next.w
    if (next.h !== h.value) h.value = next.h
  },
})

const root = useTemplateRef<HTMLDivElement>('root')
const flow = computed(() => layout === 'flow')

// Other elements in a `DraggableContainer` snap to this one, whether or not it can be dragged. In
// flow, x / y are ignored, so the snap target is where the browser placed the element: its offset
// in the nearest positioned ancestor, which is also the box absolute siblings' x / y refer to.
// The offset is in whole px but untransformed like x / y, which a bounding rect would not be.
const member = useContainerMember(() => {
  const el = root.value
  return flow.value && el ? { ...rect.value, x: el.offsetLeft, y: el.offsetTop } : rect.value
})

// In flow the browser owns the position, so dragging is silently inert.
const effectiveDraggable = computed(() => draggable && !flow.value)

// In flow, a dimension whose model is 0 renders at its content's size, synced into the model.
const naturalSize = useNaturalSize({ root, enabled: () => flow.value, w, h })
// The `boundary` element's content box caps the size, folded into maxW / maxH below.
const boundarySize = useBoundarySize(root, () => boundary)

const constraints = computed<ConstraintOptions>(() => {
  const cap = boundarySize.size.value
  return {
    disabledX,
    disabledY,
    disabledW,
    disabledH,
    minW,
    minH,
    maxW: cap ? Math.min(maxW ?? Infinity, cap.width) : maxW,
    // In flow only the width is capped: documents grow with their content (aspect lock still
    // bounds the height through the width).
    maxH: cap && !flow.value ? Math.min(maxH ?? Infinity, cap.height) : maxH,
    // `parent` measures the immediate wrapper and reads x / y, neither of which applies in flow.
    parent: flow.value ? false : parent,
    lockAspectRatio,
  }
})

// Logical handles and the flow anchor depend on the text direction, read from the computed styles.
const {
  direction,
  anchoredEdge,
  refresh: refreshDirection,
} = useDirection({
  root,
  flowAnchor: () => (flow.value ? flowAnchor : 'none'),
})

const { gesture, startDrag, startResize, stepDrag, stepResize, endSteps } = useGesture({
  root,
  rect,
  constraints,
  draggable: () => effectiveDraggable.value,
  resizable: () => resizable,
  anchor: () => !flow.value,
  symmetric: () => anchoredEdge.value === 'center',
  member,
  emit,
})

const keyboardEnabled = computed(() => !!keyboard && (resizable || effectiveDraggable.value))

const { onKeydown, onKeyup, onFocus, onBlur } = useKeyboard({
  enabled: () => keyboardEnabled.value,
  active,
  mode: () => keyboardMode ?? (effectiveDraggable.value ? 'move' : 'resize'),
  step: () => keyboardStep,
  direction: () => direction.value,
  refreshDirection,
  stepDrag,
  stepResize,
  endSteps,
})

// Assistive technology learns the size when focusing the element and once a resize has ended,
// never in the middle of a gesture.
const sizeId = useId()
const sizeText = computed<string>((previous) =>
  gesture.value && previous !== undefined ? previous : ariaSizeText(w.value, h.value),
)

const dragging = computed(() => gesture.value?.kind === 'drag')
const resizingHandle = computed(() =>
  gesture.value?.kind === 'resize' ? gesture.value.handle : null,
)

const onPointerDown = (event: PointerEvent) => {
  active.value = true
  boundarySize.refresh()
  startDrag(event)
}

const onHandlePointerDown = (event: PointerEvent, handle: PhysicalResizeHandle) => {
  // The gesture's start rect (and a locked aspect ratio) must never be measured stale, nor the
  // flow anchor it grows by.
  naturalSize.refresh()
  boundarySize.refresh()
  refreshDirection()
  startResize(event, handle)
}

const onOutsidePointerDown = (event: PointerEvent) => {
  if (active.value && !root.value?.contains(event.target as Node | null)) {
    active.value = false
  }
}

watch(active, (isActive) => {
  if (isActive) {
    // Before the handles show: the direction may have changed while the element was inactive.
    refreshDirection()
    emit('activated')
  } else {
    emit('deactivated')
  }
})

onMounted(() => document.addEventListener('pointerdown', onOutsidePointerDown))
onBeforeUnmount(() => document.removeEventListener('pointerdown', onOutsidePointerDown))

const visibleHandles = computed(() => {
  if (!resizable) return []
  const hidden = hideAnchoredHandles ? anchoredEdge.value : null
  return resolveHandles(handles, direction.value).filter(
    (handle) => !isOnAnchoredEdge(handle, hidden),
  )
})

const style = computed(() => ({
  // In flow the browser owns the position, and a natural dimension has no inline size either.
  left: flow.value ? undefined : `${x.value}px`,
  top: flow.value ? undefined : `${y.value}px`,
  width: flow.value && naturalSize.naturalW.value ? undefined : `${w.value}px`,
  height: flow.value && naturalSize.naturalH.value ? undefined : `${h.value}px`,
  // Without this the browser claims touch gestures for scrolling and cancels the pointer.
  touchAction: effectiveDraggable.value || resizable ? 'none' : undefined,
}))

const stateClasses = computed(() => ({
  [classNameDraggable]: effectiveDraggable.value,
  [classNameResizable]: resizable,
  [classNameDragging]: dragging.value,
  [classNameResizing]: resizingHandle.value !== null,
  [classNameActive]: active.value,
}))

const handleClasses = (handle: PhysicalResizeHandle) => [
  ...new Set([
    'vdr-handle',
    `vdr-handle-${handle}`,
    classNameHandle,
    `${classNameHandle}-${handle}`,
  ]),
]
</script>

<template>
  <div
    ref="root"
    class="vdr-container"
    :class="stateClasses"
    :style="style"
    :data-layout="flow ? 'flow' : undefined"
    :data-active="active || undefined"
    :data-dragging="dragging || undefined"
    :data-resizing="resizingHandle ?? undefined"
    :data-keyboard="keyboardEnabled || undefined"
    :tabindex="keyboardEnabled ? 0 : undefined"
    :role="keyboardEnabled ? 'group' : undefined"
    :aria-roledescription="keyboardEnabled ? ariaRoleDescription : undefined"
    :aria-describedby="keyboardEnabled ? sizeId : undefined"
    @click="active = true"
    @pointerdown="onPointerDown"
    @dragstart.prevent
    @focus="onFocus"
    @blur="onBlur"
    @keydown="onKeydown"
    @keyup="onKeyup"
  >
    <slot />
    <span v-if="keyboardEnabled" :id="sizeId" class="vdr-sr-only" aria-live="polite">
      {{ sizeText }}
    </span>
    <div
      v-for="handle in visibleHandles"
      v-show="active"
      :key="handle"
      :class="handleClasses(handle)"
      :data-handle="handle"
      aria-hidden="true"
      @pointerdown.stop="onHandlePointerDown($event, handle)"
    />
  </div>
</template>

<style>
.vdr-container {
  position: absolute;
  box-sizing: border-box;
}

/* `inline-block` shrinks to fit the content, which natural sizing measures. Override it with
   plain CSS (e.g. `display: block`) if the element should fill its line instead. */
.vdr-container[data-layout='flow'] {
  position: relative;
  display: inline-block;
}

/* An outline, not a border: the frame never contributes to the box model, so `w` / `h` always
   equal the true content size. Drawn inwards by default, in the band the old inside border
   occupied; `--vdr-border-offset: 0` draws it just outside the content. Keyboard focus shows it
   too, before the element is activated. */
.vdr-container[data-active],
.vdr-container[data-keyboard]:focus-visible {
  outline: var(--vdr-border-width, 1px) dashed var(--vdr-border-color, #000);
  outline-offset: var(--vdr-border-offset, calc(-1 * var(--vdr-border-width, 1px)));
}

.vdr-container[data-dragging] {
  outline-style: solid;
}

.vdr-container[data-dragging],
.vdr-container[data-resizing] {
  user-select: none;
}

/* `--vdr-border-offset` as a length, so that a bare `0` can take part in `calc()`. */
@property --_vdr-frame-offset {
  syntax: '<length>';
  inherits: false;
  initial-value: 0px;
}

.vdr-handle {
  --_vdr-handle-size: var(--vdr-handle-size, 7px);
  /* Unset, the handles keep their 1.x position, centred `--vdr-border-width / 2` outside the
     edge — while the default frame line is drawn just inside it. */
  --_vdr-frame-offset: var(--vdr-border-offset, 0px);
  /* Centres the handle on the frame line, whose centre is `offset + width / 2` outside the edge. */
  --_vdr-handle-offset: calc(
    -1 * (var(--_vdr-frame-offset) + var(--vdr-border-width, 1px) / 2) - var(--_vdr-handle-size) / 2
  );

  position: absolute;
  box-sizing: border-box;
  width: var(--_vdr-handle-size);
  height: var(--_vdr-handle-size);
  background: var(--vdr-handle-background, #f0f0f0);
  border: var(--vdr-handle-border-width, 1px) solid var(--vdr-handle-border-color, #333);
}

/* Zero specificity, so consumer rules that styled these before the properties existed still win. */
:where(.vdr-handle) {
  border-radius: var(--vdr-handle-radius, 0);
  box-shadow: var(--vdr-handle-shadow, none);
}

/* The pointer target: a transparent `--vdr-handle-hit-size` square centred on the handle. */
:where(.vdr-handle)::before {
  --_vdr-hit-size: var(--vdr-handle-hit-size, var(--_vdr-handle-size));

  content: '';
  position: absolute;
  top: calc(50% - var(--_vdr-hit-size) / 2);
  left: calc(50% - var(--_vdr-hit-size) / 2);
  width: var(--_vdr-hit-size);
  height: var(--_vdr-hit-size);
}

.vdr-handle-tl,
.vdr-handle-tm,
.vdr-handle-tr {
  top: var(--_vdr-handle-offset);
}

.vdr-handle-bl,
.vdr-handle-bm,
.vdr-handle-br {
  bottom: var(--_vdr-handle-offset);
}

.vdr-handle-tl,
.vdr-handle-ml,
.vdr-handle-bl {
  left: var(--_vdr-handle-offset);
}

.vdr-handle-tr,
.vdr-handle-mr,
.vdr-handle-br {
  right: var(--_vdr-handle-offset);
}

.vdr-handle-tm,
.vdr-handle-bm {
  left: 50%;
  margin-left: calc(var(--_vdr-handle-size) / -2);
}

.vdr-handle-ml,
.vdr-handle-mr {
  top: 50%;
  margin-top: calc(var(--_vdr-handle-size) / -2);
}

.vdr-handle-tl,
.vdr-handle-br {
  cursor: nwse-resize;
}

.vdr-handle-tr,
.vdr-handle-bl {
  cursor: nesw-resize;
}

.vdr-handle-tm,
.vdr-handle-bm {
  cursor: ns-resize;
}

.vdr-handle-ml,
.vdr-handle-mr {
  cursor: ew-resize;
}

.vdr-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

/* Windows high contrast and other forced colour schemes: system colours that always contrast. */
@media (forced-colors: active) {
  .vdr-container[data-active],
  .vdr-container[data-keyboard]:focus-visible {
    outline-color: CanvasText;
  }

  .vdr-handle {
    forced-color-adjust: none;
    background: Canvas;
    border-color: CanvasText;
  }
}
</style>
