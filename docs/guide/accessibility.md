<script setup>
import Accessibility from '../demos/Accessibility.vue'
</script>

# Accessibility

The component aims to never stand in the way of meeting WCAG 2.2 AA. It covers what it can on
its own; some parts — labels, translations and a non-dragging way to resize — only the app can
provide.

<DemoFrame><Accessibility /></DemoFrame>

<<< @/demos/Accessibility.vue

## Keyboard

Turn it on with the `keyboard` prop. Pass translations for the texts:

```vue
<DraggableResizable
  layout="flow"
  keyboard
  :aria-label="t('Image')"
  :aria-role-description="t('resizable image')"
  :ariaSizeText="(w, h) => t('%s by %s pixels', Math.round(w), Math.round(h))"
/>
```

| Key                   | Action                                                                                           |
| --------------------- | ------------------------------------------------------------------------------------------------ |
| `Tab`                 | Focuses the element, which activates it (`v-model:active`).                                      |
| `Escape`              | Deactivates it; focus stays on it.                                                               |
| `Enter`               | Activates it again.                                                                              |
| `ArrowRight` / `Left` | Resize: grows / shrinks the width at the inline-end edge (mirrored in RTL: `ArrowLeft` grows).   |
| `ArrowDown` / `Up`    | Resize: grows / shrinks the height at the bottom edge.                                           |
| `Home` / `End`        | Resize: width to its minimum / to its maximum (`maxW`, `boundary`, `parent`), when there is one. |
| arrows                | Move (`keyboardMode="move"`): by the step, physically.                                           |
| `Shift` + arrows      | Ten steps at once.                                                                               |

One step is `keyboardStep` px (default `1`). Every constraint applies, as for a pointer gesture:
min / max sizes, `boundary`, `parent`, `lockAspectRatio` (the other dimension follows) and the
`disabled*` props. Arrow keys of an inactive element, keys with `Ctrl`, `Meta` or `Alt`, and keys
typed into focusable content inside the element are left alone. A draggable element in absolute
layout moves by default; set `keyboard-mode="resize"` to resize it instead. Events follow the
[gesture rules](./events#gestures): one `*-start` / `*-end` pair per key sequence.

## Semantics

With `keyboard`, the root gets `tabindex="0"`, `role="group"`, `aria-roledescription` (from
`ariaRoleDescription`, default `"resizable"`) and an `aria-describedby` pointing at a visually
hidden, polite live text with the current size (from `ariaSizeText`, default `"200 × 100"`). The
size text is updated when a resize ends, never mid gesture. `aria-label` / `aria-labelledby` and
any other attributes fall through to the root, so name the element there. The handles are
pointer affordances only: they carry `aria-hidden="true"` and are never focusable. Without
`keyboard`, nothing but the handles' `aria-hidden` is added.

## Pointer targets (WCAG 2.5.8)

The default handles are 7px squares. Set `--vdr-handle-hit-size: 24px` to give each one a
24 × 24 pointer target without changing what is drawn.

## Dragging movements (WCAG 2.5.7)

Resizing with the handles is a dragging movement, and the keyboard is not a single-pointer
alternative. Offer one in your UI — for example preset sizes in the
[`#toolbar` slot](./toolbar), like the Small / Medium / Large buttons in the demo above.

[`resizeTo`](./toolbar#resizeto) applies the same constraints as a gesture and emits the resize
events, so the presets keep the aspect ratio and are saved by your `@resize-end` handler. The
toolbar's own keyboard support is described under
[Keyboard and focus](./toolbar#keyboard-and-focus).
