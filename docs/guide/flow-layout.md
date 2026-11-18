<script setup>
import FlowLayout from '../demos/FlowLayout.vue'
</script>

# Flow layout

`layout="flow"` keeps the element in normal document flow — the mode for content that belongs to
a text, such as a resizable image in a rich-text editor. The element occupies space, pushes the
following content down as it grows, and never overlaps its surroundings.

<DemoFrame><FlowLayout /></DemoFrame>

<<< @/demos/FlowLayout.vue

In flow layout:

- The root renders `position: relative; display: inline-block` (via
  `.vdr-container[data-layout='flow']`). `inline-block` is required for natural sizing — the
  element shrinks to fit its content; override it with plain CSS (e.g. `display: block`) if it
  should fill its line instead.
- **The browser owns the position.** `x` / `y` are ignored, dragging is silently inert, and
  resizing never moves the element: `t` / `l` handles grow the size by the usual pointer delta,
  and the element extends per its flow position (in absolute layout they move the element to keep
  the opposite edge in place). All eight handles stay usable; `tr` cannot displace the element
  upwards.
- `parent` is ignored — its measured element is the immediate wrapper, which usually tracks the
  content itself. Use [`boundary`](./boundary) to cap the size.
- Give the slotted image `display: block; width: 100%; height: 100%` so it always fills the
  frame — both while natural (the frame shrinks to the image's responsive size) and once sized.
- When the component is not mounted (e.g. the editor shows a plain `<img>` outside of resize
  mode), display the persisted size yourself, responsive constraints included:
  `width: <saved>px; height: auto; max-width: 100%`.

## Natural sizing

In flow layout, a dimension whose model is `0` (the default) is **natural**: it gets no inline
size, the content renders at its responsive size, and the component syncs the rendered
(fractional) size back into `v-model:w` / `v-model:h` — without emitting resize events, so
mounting, selecting or an image finishing to load never looks like a user resize. The element
stays responsive (a natural dimension keeps following the layout, e.g. through an async image
load) until that dimension is actually written from outside the sync:

- the first movement of a resize gesture makes the gestured dimensions explicit, and
- an external write makes a dimension explicit — writing `0` makes it natural again.

Each dimension is tracked separately: `v-model:w="500"` with `h` left at `0` gives a fixed width
and a height that keeps tracking the content. `initW` / `initH` make the size explicit from the
start. Natural sizing is not available in absolute layout, which keeps its documented no-auto-size
contract.

::: warning
A `v-model` handler that transforms the synced value (e.g. rounds it) writes back a _different_
value — an external write, which ends naturalness on the spot. Keep the models verbatim and
persist (round, convert) in your `resize-end` handler instead, which only fires for real
gestures.
:::

## Text direction

Which edge stays put while a flow element resizes depends on the text direction and alignment.
See [Right-to-left text](./rtl) for logical handles and `flowAnchor`.

Coming from a 1.0 integration with CSS overrides? See
[Migrating from 1.0 integration overrides](/migration/from-1-0-overrides).
