import { onBeforeUnmount, onMounted, watch, type Ref, type ShallowRef } from 'vue'

import type { DraggableResizableEmit } from '../types'

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

/**
 * Whether the element is active, and everything that changes it: a press or click on the element
 * (not in its toolbar), a press outside it, focus, and `activate()` / `deactivate()`. Emits
 * `activated` / `deactivated`, and moves focus out of the toolbar before it hides.
 */
export const useActivation = ({
  root,
  active,
  inToolbar,
  ignoreOutside,
  focusable,
  onActivate,
  emit,
}: UseActivationOptions) => {
  const activate = () => {
    active.value = true
  }

  const deactivate = () => {
    active.value = false
  }

  // A click in the toolbar does not activate: a button there may just have deactivated the element.
  const onClick = (event: MouseEvent) => {
    if (!inToolbar(event.target)) activate()
  }

  /**
   * A press on the element activates it; `false` for a press in the toolbar, which starts no
   * gesture either. Events from the toolbar are not stopped (other elements' outside handlers
   * still see them), only ignored here.
   */
  const onPress = (event: PointerEvent) => {
    if (inToolbar(event.target)) return false
    activate()
    return true
  }

  // Focus coming back from the toolbar (e.g. as it hides) does not activate the element again.
  const onFocus = (event: FocusEvent) => {
    if (focusable() && !inToolbar(event.relatedTarget)) activate()
  }

  const onOutsidePress = (event: PointerEvent) => {
    const target = event.target
    if (!active.value || root.value?.contains(target as Node | null)) return
    if (target instanceof Element && ignoreOutside()?.(target)) return
    deactivate()
  }

  watch(active, (isActive) => {
    if (isActive) {
      onActivate()
      emit('activated')
    } else {
      // Before the toolbar hides: focus inside it would be lost to the document otherwise.
      if (focusable() && inToolbar(document.activeElement)) root.value?.focus()
      emit('deactivated')
    }
  })

  onMounted(() => document.addEventListener('pointerdown', onOutsidePress))
  onBeforeUnmount(() => document.removeEventListener('pointerdown', onOutsidePress))

  return { activate, deactivate, onClick, onPress, onFocus }
}
