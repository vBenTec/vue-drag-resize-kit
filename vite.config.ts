import { fileURLToPath } from 'node:url'

import vue from '@vitejs/plugin-vue'
import { playwright } from '@vitest/browser-playwright'
import { configDefaults, defineConfig } from 'vitest/config'
import type { BrowserCommand } from 'vitest/node'

/** Emulates `forced-colors: active` (Windows high contrast) in the test page, or turns it off. */
const setForcedColors: BrowserCommand<[active: boolean]> = async ({ page }, active) => {
  await page.emulateMedia({ forcedColors: active ? 'active' : 'none' })
}

export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
      formats: ['es'],
      fileName: () => 'index.js',
      cssFileName: 'style',
    },
    // Consumers minify; readable output is easier to debug and to patch.
    minify: false,
    rolldownOptions: {
      external: ['vue'],
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'happy-dom',
          include: ['src/**/*.test.ts'],
          exclude: [...configDefaults.exclude, 'src/**/*.browser.test.ts'],
          typecheck: {
            enabled: true,
            checker: 'vue-tsc',
            include: ['src/**/*.test-d.ts'],
          },
        },
      },
      {
        extends: true,
        // Pre-bundled before the first run, so Vite does not reload tests mid-flight.
        optimizeDeps: { include: ['vue'] },
        test: {
          name: 'browser',
          include: ['src/**/*.browser.test.ts'],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: 'chromium' }],
            commands: { setForcedColors },
          },
        },
      },
    ],
  },
})
