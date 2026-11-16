# Glossary

Domain terms used in the code and in design discussions. Words that are clear from the code
(_element_, _container_, _parent_, _handle_, _constraints_) are not listed.

**Boundary**: An element whose content box (paddings subtracted) caps the size of a
`DraggableResizable` — typically an editor column or other containing block further up than the
immediate parent. Size-only: unlike `parent` it never constrains the position.

**Flow layout**: The `layout="flow"` mode, in which the element stays in normal document flow and
the browser owns its position: `x` / `y` are ignored, dragging is inert, and resizing grows the
size without ever moving the rect (no `t` / `l` anchoring compensation).

**Gesture**: One drag or one resize of an element, from the first pointer movement after
pointer-down until the pointer is released or the gesture is cancelled. A press without movement
is not a gesture and emits no events. An element has at most one gesture at a time.

**Guides**: The coordinates an element can snap to while it is dragged inside a container: custom
guides, the parent's edges and centre, and the edges and centres of the other members. Vertical
guides are x coordinates, horizontal guides are y coordinates.

**Matched guides**: The guides the dragged element is currently aligned with. The container draws
them as lines.

**Natural size**: In flow layout, a dimension whose model is `0`: it gets no inline size, the
content renders at its responsive size, and that size is synced back into the model (without
resize events) until the dimension is resized by a gesture or written from outside. Writing `0`
makes it natural again.

**Member**: An element registered with a container as a snap target. Every element inside a
container is a member, whether or not it can be dragged itself.

**Snap session**: One drag's access to the container's guides. It starts with the drag, publishes
the matched guides on every move and clears them when it ends. Only the most recently started
session that has not ended can publish, so an older live session shows its guides again once the
newer one ends.
