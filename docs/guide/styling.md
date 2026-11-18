<script setup>
import Theming from '../demos/Theming.vue'
</script>

# Styling

The stylesheet is small and unscoped. Everything is prefixed with `vdr-`, and the state is
exposed as `data-*` attributes on the element. All selectors and custom properties are listed in
the [CSS reference](/api/css).

<DemoFrame><Theming /></DemoFrame>

<<< @/demos/Theming.vue

## The frame

The selection frame is drawn as an `outline` (dashed while active, solid while dragging), not a
border: it never contributes to the box model, so `w` / `h` always equal the element's true
content size and activating an element cannot shift its content or its neighbours. The historical
`--vdr-border-*` property names are kept and style the outline.

## Theming

Theme it with [CSS custom properties](/api/css#custom-properties), set on the element or any
ancestor:

```css
.editor {
  --vdr-border-color: #4f46e5;
  --vdr-handle-size: 10px;
  --vdr-handle-background: #fff;
  --vdr-handle-border-color: #4f46e5;
}
```

A dashed frame just outside the image and solid handles with a white contrast border, as Gmail
draws them:

```css
.editor {
  --vdr-border-offset: 0; /* dashed line just outside the image */
  --vdr-handle-size: 10px;
  --vdr-handle-background: #4f46e5; /* solid square */
  --vdr-handle-border-color: #fff; /* white contrast border */
  --vdr-handle-border-width: 2px;
  --vdr-handle-hit-size: 24px; /* see Accessibility */
}
```

The handles are centred on the frame line (whose centre is `--vdr-border-offset +
--vdr-border-width / 2` outside the content edge), whatever the offset, width and handle border.
While `--vdr-border-offset` is unset they keep their 1.x position, half the frame width
_outside_ the edge, although the default frame line is drawn just _inside_ it — a 1px mismatch
kept so that existing layouts render pixel for pixel as before. Set the default explicitly to
centre them exactly: `--vdr-border-offset: calc(-1 * var(--vdr-border-width, 1px))`.

`--vdr-handle-radius` and `--vdr-handle-shadow` are applied with zero specificity, so a rule of
your own that sets `border-radius` or `box-shadow` on the handles keeps winning.

## Class names

The `className*` props add classes on top of these, which is handy with utility CSS:

```vue
<DraggableResizable class-name-active="ring-2" class-name-handle="my-handle" />
<!-- handles render as: class="vdr-handle vdr-handle-tl my-handle my-handle-tl" -->
```

## Touch, focus and forced colours

The component sets `touch-action: none` on itself so that touch gestures drag the element
instead of scrolling the page.

With `keyboard`, the frame is also drawn while the element has keyboard focus
(`.vdr-container[data-keyboard]:focus-visible`), before it is activated. In forced colours mode
(`@media (forced-colors: active)`, e.g. Windows high contrast) the frame is drawn in `CanvasText`
and the handles in `Canvas` with a `CanvasText` border, so they stay visible whatever the custom
properties say.
