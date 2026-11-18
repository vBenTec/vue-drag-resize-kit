---
aside: false
---

# CSS

Import the stylesheet once, anywhere in your app:

```ts
import 'vue-drag-resize-kit/style.css'
```

## Selectors

| Selector                              | Element                                     |
| ------------------------------------- | ------------------------------------------- |
| `.vdr-container`                      | The draggable element.                      |
| `.vdr-container[data-active]`         | … while active.                             |
| `.vdr-container[data-dragging]`       | … while dragging.                           |
| `.vdr-container[data-resizing]`       | … while resizing (the value is the handle). |
| `.vdr-container[data-layout='flow']`  | … with `layout="flow"`.                     |
| `.vdr-container[data-keyboard]`       | … with `keyboard` on.                       |
| `.vdr-handle`, `.vdr-handle-<handle>` | A resize handle (always the physical name). |
| `.vdr-sr-only`                        | The visually hidden size text (`keyboard`). |
| `.vdr-snap-container`                 | The `DraggableContainer` root.              |
| `.vdr-guide`, `.vdr-guide-x`, `-y`    | A guide (`-x` vertical, `-y` horizontal).   |

## Custom properties

Set them on the element or any ancestor.

| Property                    | Default                   | Applies to                                                                   |
| --------------------------- | ------------------------- | ---------------------------------------------------------------------------- |
| `--vdr-border-color`        | `#000`                    | Frame colour.                                                                |
| `--vdr-border-width`        | `1px`                     | Frame width.                                                                 |
| `--vdr-border-offset`       | `-1 * --vdr-border-width` | Frame `outline-offset`: drawn inside the content; `0` draws it just outside. |
| `--vdr-handle-size`         | `7px`                     | Drawn handle size.                                                           |
| `--vdr-handle-background`   | `#f0f0f0`                 | Handle fill.                                                                 |
| `--vdr-handle-border-color` | `#333`                    | Handle border colour.                                                        |
| `--vdr-handle-border-width` | `1px`                     | Handle border width (inside the handle size).                                |
| `--vdr-handle-radius`       | `0`                       | Handle `border-radius`.                                                      |
| `--vdr-handle-shadow`       | `none`                    | Handle `box-shadow`, e.g. a soft ring.                                       |
| `--vdr-handle-hit-size`     | `--vdr-handle-size`       | Pointer target size; larger than the handle adds a transparent margin.       |
| `--vdr-guide-color`         | `#f00`                    | Snapping guides.                                                             |

See [Styling](/guide/styling) for examples and how the handles are positioned.
