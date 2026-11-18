import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import { h } from 'vue'

import DemoFrame from './DemoFrame.vue'
import HeroDemo from './HeroDemo.vue'

import './custom.css'

export default {
  extends: DefaultTheme,
  Layout: () => h(DefaultTheme.Layout, null, { 'home-hero-image': () => h(HeroDemo) }),
  enhanceApp({ app }) {
    app.component('DemoFrame', DemoFrame)
  },
} satisfies Theme
