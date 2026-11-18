# Migrating from 1.0 integration overrides

If you integrated `1.0.0` into an editor with consumer-side workarounds, [flow layout](/guide/flow-layout)
replaces them:

- **Drop `position: relative !important; display: inline-block !important`** overrides on
  `.vdr-container` — `layout="flow"` renders exactly that.
- **Drop `border: 0 !important`** — the selection frame is an outline and no longer contributes
  to the box model, so it cannot shrink the content; the dashed frame is back for free.
- **Drop measuring the image before mounting** (`getBoundingClientRect` + passing `w`/`h`) —
  leave the models at `0` and natural sizing seeds them with the displayed size, fractional,
  without fake resize events.
- **Drop computing `max-width` from an ancestor's `clientWidth` minus paddings** — pass the
  ancestor to `boundary` and the component measures its content box itself, live.
- **Restore the `tr` handle** — flow resizing never moves the element, so the upward displacement
  that forced its removal cannot happen.
- **Keep persisting on `resize-end`** — it now only fires for real gestures, never for a
  motionless press.
