# SSR / Nuxt

The components render on the server and attach their listeners after mounting, so no
`<ClientOnly>` wrapper is needed. Positions come from props, so the server output already has
the right layout.

Until an element mounts, its text direction is `ltr`: [logical handles](./rtl#logical-handles)
and `flowAnchor="auto"` resolve against the real direction on the client.

This documentation is itself server-rendered, demos included.
