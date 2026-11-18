import type { Ref } from 'vue'

import { getInlineEndCorner } from '../../core/direction'
import type { Direction } from '../../core/types'
import type { KeyboardMode } from '../types'

export interface UseKeyboardOptions {
  /** Whether keyboard interaction is on. */
  enabled: () => boolean
  active: Ref<boolean>
  mode: () => KeyboardMode
  /** Distance of one step (px); `Shift` multiplies it by 10. */
  step: () => number
  direction: () => Direction
  /** Re-reads the direction, before a sequence starts. */
  refreshDirection: () => void
  stepDrag: (deltaX: number, deltaY: number) => void
  stepResize: (growW: number, growH: number, handle: 'bl' | 'br') => void
  endSteps: () => void
}

/** Physical direction of each arrow key. */
const ARROWS: Partial<Record<string, [x: number, y: number]>> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
}

/**
 * Keyboard interaction on the focused element: focus activates, `Enter` re-activates, `Escape`
 * deactivates. While active, the arrow keys move the element (`move` mode) or resize its
 * inline-end / block-end edges (`resize` mode: `ArrowRight` grows the width in LTR, `ArrowLeft`
 * in RTL), and `Home` / `End` resize the width to its min / max. The keys held at once form one
 * sequence — one gesture, ended when the last of them is released or the element loses focus.
 */
export const useKeyboard = ({
  enabled,
  active,
  mode,
  step,
  direction,
  refreshDirection,
  stepDrag,
  stepResize,
  endSteps,
}: UseKeyboardOptions) => {
  // The handled keys currently held down; the sequence ends when the last one is released.
  const pressed = new Set<string>()

  const end = () => {
    pressed.clear()
    endSteps()
  }

  /** Performs `key`; `false` if it has no meaning in the current mode. */
  const perform = (key: string, amount: number) => {
    const arrow = ARROWS[key]
    if (mode() === 'move') {
      if (!arrow) return false
      stepDrag(arrow[0] * amount, arrow[1] * amount)
      return true
    }

    // The width changes at the inline-end edge.
    const rtl = direction() === 'rtl'
    const handle = getInlineEndCorner(direction())
    if (key === 'Home') stepResize(-Infinity, 0, handle)
    else if (key === 'End') stepResize(Infinity, 0, handle)
    else if (!arrow) return false
    // The width grows towards the inline end: rightwards in LTR, leftwards in RTL.
    else if (arrow[0]) stepResize((rtl ? -arrow[0] : arrow[0]) * amount, 0, handle)
    else stepResize(0, arrow[1] * amount, handle)
    return true
  }

  const onKeydown = (event: KeyboardEvent) => {
    // Keys typed into focusable content (an input in the slot) are not for the element.
    if (!enabled() || event.target !== event.currentTarget) return

    if (event.key === 'Escape' || event.key === 'Enter') {
      const activate = event.key === 'Enter'
      if (active.value === activate) return
      end()
      active.value = activate
      event.preventDefault()
      return
    }

    // Arrows of an inactive element scroll the page as usual; shortcuts are left alone.
    if (!active.value || event.altKey || event.ctrlKey || event.metaKey) return
    if (pressed.size === 0) refreshDirection()
    if (!perform(event.key, step() * (event.shiftKey ? 10 : 1))) return
    pressed.add(event.key)
    event.preventDefault()
  }

  const onKeyup = (event: KeyboardEvent) => {
    if (!pressed.delete(event.key) || pressed.size > 0) return
    endSteps()
  }

  const onFocus = () => {
    if (enabled()) active.value = true
  }

  return { onKeydown, onKeyup, onFocus, onBlur: end }
}
