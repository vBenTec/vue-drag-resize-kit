<script setup>
import Constraints from '../demos/Constraints.vue'
</script>

# Constraints and handles

<DemoFrame><Constraints /></DemoFrame>

<<< @/demos/Constraints.vue

## Parent

`parent` restricts movement and size to the parent element. The parent's size is its padding
box, and it follows the parent resizing. `parent` is ignored with `layout="flow"`; use
[`boundary`](./boundary) there, which can also cap the size at any element further up.

## Sizes

`minW` / `minH` (default `20`) and `maxW` / `maxH` (default: no maximum) limit the size in px.
`minW` / `minH` win over a smaller cap from `boundary`.

## Locks

- `draggable` / `resizable` (default `true`) turn dragging or resizing off altogether.
- `disabledX` / `disabledY` lock movement on one axis.
- `disabledW` / `disabledH` lock the width or the height.
- `lockAspectRatio` keeps the aspect ratio while resizing. The lock is ignored while `disabledW`
  or `disabledH` is set.

Values are not rounded: with `lockAspectRatio` or zoomed pointers, they can be fractional.

## Handles

Handle names combine a row (`t`op, `m`iddle, `b`ottom) with a column (`l`eft, `m`iddle,
`r`ight). By default all eight render, or only the four corners with `lockAspectRatio` (below):

```
tl ─ tm ─ tr
│          │
ml        mr
│          │
bl ─ bm ─ br
```

Pass `handles` to pick them. Unknown and duplicate entries are ignored:

```vue
<DraggableResizable :handles="['tl', 'br']" />
```

The logical handles name the inline-start (`s`) or inline-end (`e`) side instead of a physical
one, and resolve against the element's computed `direction`: `me` is `mr` in left-to-right text
and `ml` in right-to-left text, `ts` is `tl` / `tr`, and so on. A logical handle renders as the
physical one it resolves to (`.vdr-handle-mr`, `data-handle="mr"`); if a logical and a physical
entry resolve to the same handle, it renders once. See [Right-to-left text](./rtl).

With `lockAspectRatio`, the default handles are the four corners (`tl`, `tr`, `bl`, `br`), and
each keeps the opposite corner in place. Edge handles can still be opted into via `handles`; as
they have to change both dimensions, `tm` and `ml` resize from the top-left corner and `bm` and
`mr` from the bottom-right one. The lock is ignored while `disabledW` or `disabledH` is set, and
the default is then all eight handles again.

In absolute layout, resizing from a `t` / `l` handle moves the element to keep the opposite edge
in place. In [flow layout](./flow-layout) the element never moves.
