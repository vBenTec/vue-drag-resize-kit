/**
 * Renders the home page hero demo (theme/HeroDemo.vue) into the README images,
 * docs/public/hero-light.png and docs/public/hero-dark.png, so they always show the current
 * component. Run with `pnpm docs:screenshot` after a visual change.
 */
import { fileURLToPath } from 'node:url'

import { chromium } from 'playwright'
import { createServer } from 'vitepress'

const server = await createServer(fileURLToPath(new URL('..', import.meta.url)))
await server.listen()
const browser = await chromium.launch()

const shoot = async (scheme: 'light' | 'dark') => {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
    colorScheme: scheme,
  })
  await page.goto(server.resolvedUrls!.local[0]!, { waitUntil: 'networkidle' })
  const hero = page.locator('.hero-demo')

  // Transparent around the rounded corners, so the image sits on any README background.
  await hero.evaluate((demo) => {
    for (let el = demo.parentElement; el; el = el.parentElement) el.style.background = 'none'
    demo.querySelector<HTMLElement>('.hint')!.style.visibility = 'hidden'
  })

  // Nudge the active element without letting go, so the container draws its matched guides.
  const box = (await hero.locator('.vdr-container[data-active]').boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 - 4, box.y + box.height / 2 + 2, { steps: 4 })
  await hero.screenshot({
    path: fileURLToPath(new URL(`../public/hero-${scheme}.png`, import.meta.url)),
    omitBackground: true,
  })
  await page.close()
}

try {
  await Promise.all([shoot('light'), shoot('dark')])
} finally {
  await browser.close()
  await server.close()
}
