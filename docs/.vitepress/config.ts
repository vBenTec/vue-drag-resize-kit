import { fileURLToPath } from 'node:url'

import { defineConfig, postcssIsolateStyles } from 'vitepress'
import llmstxt from 'vitepress-plugin-llms'

const repo = 'https://github.com/vBenTec/vue-drag-resize-kit'

export default defineConfig({
  title: 'vue-drag-resize-kit',
  description:
    'Draggable and resizable component for Vue 3, with snapping, alignment guides and full TypeScript support.',
  base: '/vue-drag-resize-kit/',
  cleanUrls: true,
  head: [['meta', { name: 'theme-color', content: '#42b883' }]],

  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/getting-started', activeMatch: '/guide/' },
      { text: 'API', link: '/api/draggable-resizable', activeMatch: '/api/' },
      {
        text: 'Migration',
        link: '/migration/from-vue3-draggable-resizable',
        activeMatch: '/migration/',
      },
      { text: 'Changelog', link: '/changelog' },
    ],

    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Getting started', link: '/guide/getting-started' },
          { text: 'Constraints and handles', link: '/guide/constraints' },
          { text: 'Models and events', link: '/guide/events' },
          { text: 'Snapping', link: '/guide/snapping' },
          { text: 'Flow layout', link: '/guide/flow-layout' },
          { text: 'Boundary', link: '/guide/boundary' },
          { text: 'Right-to-left text', link: '/guide/rtl' },
          { text: 'Styling', link: '/guide/styling' },
          { text: 'Accessibility', link: '/guide/accessibility' },
          { text: 'TypeScript', link: '/guide/typescript' },
          { text: 'SSR / Nuxt', link: '/guide/ssr' },
        ],
      },
      {
        text: 'API',
        items: [
          { text: 'DraggableResizable', link: '/api/draggable-resizable' },
          { text: 'DraggableContainer', link: '/api/draggable-container' },
          { text: 'CSS', link: '/api/css' },
          { text: 'Types', link: '/api/types' },
        ],
      },
      {
        text: 'Migration',
        items: [
          {
            text: 'From vue3-draggable-resizable',
            link: '/migration/from-vue3-draggable-resizable',
          },
          { text: 'From 1.0 integration overrides', link: '/migration/from-1-0-overrides' },
        ],
      },
    ],

    search: { provider: 'local' },
    outline: { level: [2, 3] },
    editLink: { pattern: `${repo}/edit/main/docs/:path`, text: 'Edit this page on GitHub' },
    socialLinks: [
      { icon: 'github', link: repo },
      { icon: 'npm', link: 'https://www.npmjs.com/package/vue-drag-resize-kit' },
    ],
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Originally forked from vue3-draggable-resizable by ZZP; rewritten from scratch.',
    },
  },

  vite: {
    plugins: [
      // llms.txt, llms-full.txt and a .md twin of every page, generated from the pages and the
      // sidebar. `details` is the summary models read first: keep it in step with the package.
      llmstxt({
        domain: 'https://vbentec.github.io',
        details: [
          '`vue-drag-resize-kit` is ESM only, needs Vue 3.5 or newer and has no runtime dependencies.',
          'It exports two components, `DraggableResizable` (a draggable, resizable element in',
          'absolute or document-flow layout) and `DraggableContainer` (snapping to each other, the',
          'parent and custom guides), plus their types. Import the stylesheet once:',
          "`import 'vue-drag-resize-kit/style.css'`. Users of `vue3-draggable-resizable` should read",
          'the migration guide first: the API is close but not identical.',
        ].join(' '),
      }),
    ],
    resolve: {
      // The demos import the package by its public name, so their code reads as copy-pasteable
      // usage, but run against the source: the docs always document the current code. The
      // components bring their own styles from source, so the stylesheet import is a no-op here.
      alias: [
        {
          find: /^vue-drag-resize-kit\/style\.css$/,
          replacement: fileURLToPath(new URL('./theme/package-style.css', import.meta.url)),
        },
        {
          find: /^vue-drag-resize-kit$/,
          replacement: fileURLToPath(new URL('../../src/index.ts', import.meta.url)),
        },
      ],
    },
    css: {
      // Keeps the doc typography out of the demos (`.vp-raw`), so they render as in an app.
      postcss: { plugins: [postcssIsolateStyles()] },
    },
  },
})
