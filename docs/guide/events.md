<script setup>
import Events from '../demos/Events.vue'
</script>

# Models and events

<DemoFrame><Events /></DemoFrame>

<<< @/demos/Events.vue

## Models

`x`, `y`, `w`, `h` and `active` can all be bound with `v-model`. Every model is optional.
Without `v-model` the component keeps the value itself, so
`<DraggableResizable :x="50" :init-w="100" :init-h="100" />` starts at `x = 50` and can still be
moved.

`initW` / `initH` only apply while the size is not controlled: a `v-model:w` / `v-model:h` value
wins. Without either, the size is `0` — the component does not measure its content in absolute
layout. In [flow layout](./flow-layout), a size of `0` is natural instead.

An element becomes active when it is pressed, and inactive when the pointer goes down anywhere
outside it. Handles are only shown while it is active. Controls that belong to the element go
into its [`#toolbar` slot](./toolbar), which counts as inside; for anything else that must not
deactivate it (teleported popovers, say), pass [`ignoreOutside`](./toolbar#teleported-content).

## Gestures

A gesture starts with the first actual pointer movement: pressing an element or a handle and
releasing without moving emits no events (and writes no models), so persisting on `*-end` never
fires for a plain click. The `data-dragging` / `data-resizing` attributes still flip on the press,
for visual feedback.

With [`keyboard`](./accessibility), a key sequence is one gesture: the first arrow key that
changes anything emits `*-start`, every step `dragging` / `resizing`, and releasing the last held
key (or losing focus) `*-end` — never one pair per key repeat.

A [`resizeTo`](./toolbar#resizeto) call is one gesture too, ended at once: `resize-start`, one
`resizing` and `resize-end` — or nothing, if it changes nothing.

Unmounting an element during a drag or resize stops the gesture without emitting `drag-end` /
`resize-end`.

Writes to the models from outside do not emit drag or resize events; call `resizeTo` instead to
resize the way a gesture does. See the
[API reference](/api/draggable-resizable#events) for every event and its payload.
