<script setup>
import Snapping from '../demos/Snapping.vue'
</script>

# Snapping

Wrap elements in a `DraggableContainer` to make them snap to each other, to the parent's edges
and centre, and to custom guides. Matching guides are drawn while dragging.

<DemoFrame><Snapping /></DemoFrame>

<<< @/demos/Snapping.vue

The container fills its parent (`width: 100%; height: 100%; position: relative`). Elements snap
when one of their edges or their centre comes within 5px of a guide. Snapping applies while
dragging, not while resizing.

Elements with `draggable` off still act as snap targets for the others, and so do elements with
`layout="flow"` — at the position the browser laid them out (their offset in the nearest
positioned ancestor, in whole pixels), not at their ignored `x` / `y`.

An element snaps to the closest guide, is never pushed out of its parent, and only the guides it
is actually aligned with are drawn. Colour them with `guideColor` or the `--vdr-guide-color`
custom property.

All props are listed in the [API reference](/api/draggable-container).
