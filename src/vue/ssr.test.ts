import { expect, it } from 'vitest'
// @vitest-environment node
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'

import { DraggableContainer, DraggableResizable } from '../index'

it('renders on the server without touching the DOM', async () => {
  expect(typeof document).toBe('undefined')

  const app = createSSRApp({
    render: () =>
      h(DraggableContainer, () => [
        h(DraggableResizable, { x: 10, y: 20, initW: 30, initH: 40, parent: true, active: true }),
      ]),
  })

  const html = await renderToString(app)

  expect(html).toContain('vdr-snap-container')
  expect(html).toContain('left:10px;top:20px;width:30px;height:40px')
  expect(html).toContain('vdr-handle-br')
})

const render = (props: Record<string, unknown>) =>
  renderToString(createSSRApp({ render: () => h(DraggableResizable, props) }))

it('renders flow layout without position styles, and without size styles while natural', async () => {
  const natural = await render({ layout: 'flow' })
  expect(natural).toContain('data-layout="flow"')
  for (const styleProp of ['left', 'top', 'width', 'height']) {
    expect(natural).not.toContain(`${styleProp}:`)
  }

  const explicit = await render({ layout: 'flow', initW: 30, initH: 40 })
  expect(explicit).toContain('width:30px;height:40px')
  expect(explicit).not.toContain('left:')
  expect(explicit).not.toContain('top:')
})

const renderToolbar = (active: boolean) =>
  renderToString(
    createSSRApp({
      render: () =>
        h(
          DraggableResizable,
          { active, toolbarLabel: 'Size' },
          { toolbar: () => h('button', 'Small') },
        ),
    }),
  )

it('renders the toolbar hidden for an inactive element', async () => {
  const inactive = await renderToolbar(false)
  expect(inactive).toMatch(
    /<div class="vdr-toolbar" role="toolbar" aria-label="Size" data-placement="bottom" style="display:none;?">/,
  )
  expect(inactive).toContain('<button>Small</button>')
  expect(await renderToolbar(true)).not.toMatch(/vdr-toolbar[^>]*display:none/)
  expect(await render({ active: true })).not.toContain('vdr-toolbar')
})
