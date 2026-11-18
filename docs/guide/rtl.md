<script setup>
import Rtl from '../demos/Rtl.vue'
</script>

# Right-to-left text

In a rich-text editor, an image sits at the inline-start of its line, so which edge stays put
while it resizes depends on the text direction: the left edge in left-to-right text, the right
edge in right-to-left text. Only the handles on the moving edge follow the pointer. A dragged
handle on the anchored edge cannot move — the size still changes by the pointer delta, but the
opposite edge moves instead.

<DemoFrame><Rtl /></DemoFrame>

<<< @/demos/Rtl.vue

## Logical handles

Logical handles pick the moving edge for you. Name the inline-end handles and they render on the
right in LTR and on the left in RTL:

```vue
<DraggableResizable layout="flow" :handles="['te', 'me', 'be']" lock-aspect-ratio />
```

The direction is the computed `direction` of the component's root, so `dir="rtl"`, CSS
`direction` and `dir="auto"` paragraphs (which resolve their direction from their content) all
work. It is read when the element mounts, whenever it is activated and when a gesture starts — a
`dir="auto"` paragraph that turns RTL as the user types is picked up the next time the image is
selected, without observing anything while it is not. Until it mounts (and on the server) the
direction is `ltr`.

## `flowAnchor`

`flowAnchor` handles text that is not start-aligned. The anchored edge then also depends on
`text-align`: right-aligned text keeps the right edge, and a centred line moves both edges by half
the size change.

| `flowAnchor`       | Anchored edge                                                                                                             |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `'none'` (default) | Not resolved: every handle grows the size by the pointer delta (the 1.1 behaviour).                                       |
| `'start'`          | The inline-start edge (left in LTR, right in RTL).                                                                        |
| `'end'`            | The inline-end edge.                                                                                                      |
| `'center'`         | Neither: both edges move, so the width changes by twice the pointer delta and the dragged handle stays under the pointer. |
| `'auto'`           | Read from the `direction` and `text-align` of the nearest block ancestor (`justify` counts as start).                     |

With `hide-anchored-handles`, the handles on the anchored edge are not rendered, so you can pass
all eight handles and always get only the ones that track the pointer — the right side in LTR, the
left side in RTL, both on a centred line:

```vue
<DraggableResizable layout="flow" flow-anchor="auto" hide-anchored-handles lock-aspect-ratio />
```

`auto` is resolved at the same moments as the direction. `flowAnchor` is ignored in absolute
layout, where resizing from a `t` / `l` handle moves the element to keep the opposite edge in
place.
