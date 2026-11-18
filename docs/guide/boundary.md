<script setup>
import Boundary from '../demos/Boundary.vue'
</script>

# Boundary

`boundary` caps the size at the content box of another element — typically the editor column,
table cell or other containing block, which is rarely the immediate parent.

<DemoFrame><Boundary /></DemoFrame>

<<< @/demos/Boundary.vue

## Targets

```ts
type BoundaryTarget = string | HTMLElement | Ref<HTMLElement | null> | (() => HTMLElement | null)
```

A string is resolved against the component's ancestors with `closest()`.

## When the cap applies

The cap follows the boundary resizing (`ResizeObserver`) and is re-measured when a gesture starts,
so a boundary that changed before activation or while active caps the next gesture correctly;
constraints are read on every move, so a cap that changes mid-gesture applies live. The element
never moves or shrinks by itself when the boundary shrinks — the next gesture clamps. `minW` /
`minH` win over a smaller cap.

In flow layout only the width is capped (documents grow with their content; with
`lock-aspect-ratio` the width cap bounds the height anyway); in absolute layout both dimensions
are capped.

## `boundary` and `parent`

|                | `parent`              | `boundary`                                   |
| -------------- | --------------------- | -------------------------------------------- |
| Element        | the immediate parent  | any element (selector, element, ref, getter) |
| Measures       | the padding box       | the content box (paddings subtracted)        |
| Constrains     | position **and** size | size only                                    |
| In flow layout | ignored               | caps the width                               |
