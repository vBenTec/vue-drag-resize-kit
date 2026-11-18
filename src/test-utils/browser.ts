import { page } from 'vitest/browser'
import { createApp, defineComponent, nextTick, type App, type VNode } from 'vue'

import { pointer } from './index'

let apps: App<Element>[] = []

/** Mounts `render` into `host`; undone by {@link unmountAll}. */
export const mountInto = (host: Element, render: () => VNode) => {
  const app = createApp(defineComponent({ setup: () => render }))
  apps.push(app)
  app.mount(host)
  return app
}

/** Unmounts everything {@link mountInto} mounted and empties the document. */
export const unmountAll = () => {
  for (const app of apps) app.unmount()
  apps = []
  document.body.innerHTML = ''
}

/**
 * Adds the given HTML to the end of the document and returns its element. Parsed in place: nodes
 * adopted from a `<template>` miss `dir="auto"` updates in Chromium.
 */
export const fixture = <T extends HTMLElement = HTMLElement>(html: string) => {
  document.body.insertAdjacentHTML('beforeend', html.trim())
  return document.body.lastElementChild as T
}

export const svgImage = (width: number, height: number, fill = '#4f46e5') =>
  `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='${width}' ` +
  `height='${height}'><rect width='${width}' height='${height}' fill='${encodeURIComponent(fill)}'/></svg>`

export const handleOf = (root: HTMLElement, name: string) =>
  root.querySelector<HTMLElement>(`[data-handle="${name}"]`)!

export const handleNames = (root: HTMLElement) =>
  [...root.querySelectorAll<HTMLElement>('.vdr-handle')].map((handle) => handle.dataset.handle)

export const centreOf = (element: Element) => {
  const { left, top, width, height } = element.getBoundingClientRect()
  return { x: left + width / 2, y: top + height / 2 }
}

/**
 * Presses on `target` at its centre and moves the pointer by each delta in turn, yielding to the
 * Vue scheduler between events like a browser between real pointer events. Returns where the
 * pointer was released.
 */
export const dragFromCentre = async (target: Element, moves: [number, number][]) => {
  const from = centreOf(target)
  pointer(target, 'pointerdown', from.x, from.y)
  let to = from
  for (const [deltaX, deltaY] of moves) {
    to = { x: from.x + deltaX, y: from.y + deltaY }
    // oxlint-disable-next-line no-await-in-loop -- the moves are sequential by nature
    await nextTick()
    pointer(document, 'pointermove', to.x, to.y)
  }
  await nextTick()
  pointer(document, 'pointerup', to.x, to.y)
  await nextTick()
  return to
}

/** Waits until the browser rendered a frame, so pending `ResizeObserver` notifications are in. */
export const rendered = () =>
  new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))

export type Rgb = [r: number, g: number, b: number]

/** The pixels of a screenshot of `element`'s border box, addressed in CSS px relative to it. */
export const screenshotPixels = async (element: HTMLElement) => {
  await rendered()
  const base64 = await page.screenshot({ element, save: false })
  const image = new Image()
  image.src = `data:image/png;base64,${base64}`
  await image.decode()

  const canvas = document.createElement('canvas')
  canvas.width = image.width
  canvas.height = image.height
  const context = canvas.getContext('2d')!
  context.drawImage(image, 0, 0)
  const { data } = context.getImageData(0, 0, image.width, image.height)
  const scale = image.width / element.getBoundingClientRect().width

  const at = (x: number, y: number): Rgb => {
    const index = (Math.floor(y * scale) * image.width + Math.floor(x * scale)) * 4
    return [data[index]!, data[index + 1]!, data[index + 2]!]
  }
  /** The distinct colours of the pixels in a rect (CSS px, relative to the element). */
  const coloursIn = (x: number, y: number, width: number, height: number) => {
    const colours = new Set<string>()
    for (let row = y; row < y + height; row++) {
      for (let column = x; column < x + width; column++) colours.add(at(column, row).join(','))
    }
    return [...colours].toSorted()
  }
  return { scale, at, coloursIn }
}

/** A colour as `getComputedStyle` reports it, e.g. a system colour such as `CanvasText`. */
export const resolveColour = (colour: string) => {
  const probe = document.createElement('div')
  probe.style.color = colour
  document.body.appendChild(probe)
  const resolved = getComputedStyle(probe).color
  probe.remove()
  return resolved
}
