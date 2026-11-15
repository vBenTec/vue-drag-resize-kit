<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, useTemplateRef, watch } from 'vue'

import { ALL_HANDLES, filterHandles } from '../../core/handles'
import type { ConstraintOptions, Rect, ResizeHandle } from '../../core/types'
import { useBoundarySize } from '../composables/useBoundarySize'
import { useContainerMember } from '../composables/useContainer'
import { useGesture } from '../composables/useGesture'
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
  lockAspectRatio,
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
// Other elements in a `DraggableContainer` snap to this one, whether or not it can be dragged.
const member = useContainerMember(() => rect.value)

const flow = computed(() => layout === 'flow')
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

const { gesture, startDrag, startResize } = useGesture({
  root,
  rect,
  constraints,
  draggable: () => effectiveDraggable.value,
  resizable: () => resizable,
  anchor: () => !flow.value,
  member,
  emit,
})

const dragging = computed(() => gesture.value?.kind === 'drag')
const resizingHandle = computed(() =>
  gesture.value?.kind === 'resize' ? gesture.value.handle : null,
)

const onPointerDown = (event: PointerEvent) => {
  active.value = true
  boundarySize.refresh()
  startDrag(event)
}

const onHandlePointerDown = (event: PointerEvent, handle: ResizeHandle) => {
  // The gesture's start rect (and a locked aspect ratio) must never be measured stale.
  naturalSize.refresh()
  boundarySize.refresh()
  startResize(event, handle)
}

const onOutsidePointerDown = (event: PointerEvent) => {
  if (active.value && !root.value?.contains(event.target as Node | null)) {
    active.value = false
  }
}

watch(active, (isActive) => {
  if (isActive) emit('activated')
  else emit('deactivated')
})

onMounted(() => document.addEventListener('pointerdown', onOutsidePointerDown))
onBeforeUnmount(() => document.removeEventListener('pointerdown', onOutsidePointerDown))

const visibleHandles = computed(() => (resizable ? filterHandles(handles) : []))

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

const handleClasses = (handle: ResizeHandle) => [
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
    @click="active = true"
    @pointerdown="onPointerDown"
    @dragstart.prevent
  >
    <slot />
    <div
      v-for="handle in visibleHandles"
      v-show="active"
      :key="handle"
      :class="handleClasses(handle)"
      :data-handle="handle"
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
   equal the true content size. Drawn inwards, in the band the old inside border occupied. */
.vdr-container[data-active] {
  outline: var(--vdr-border-width, 1px) dashed var(--vdr-border-color, #000);
  outline-offset: calc(-1 * var(--vdr-border-width, 1px));
}

.vdr-container[data-dragging] {
  outline-style: solid;
}

.vdr-container[data-dragging],
.vdr-container[data-resizing] {
  user-select: none;
}

.vdr-handle {
  --_vdr-handle-size: var(--vdr-handle-size, 7px);
  /* Centres the handle on the container's border. */
  --_vdr-handle-offset: calc((var(--_vdr-handle-size) + var(--vdr-border-width, 1px)) / -2);

  position: absolute;
  box-sizing: border-box;
  width: var(--_vdr-handle-size);
  height: var(--_vdr-handle-size);
  background: var(--vdr-handle-background, #f0f0f0);
  border: 1px solid var(--vdr-handle-border-color, #333);
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
</style>
