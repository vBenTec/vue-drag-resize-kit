<script setup lang="ts">
import { ref } from 'vue'
import { DraggableResizable } from 'vue-drag-resize-kit'

import 'vue-drag-resize-kit/style.css'

const dir = ref<'ltr' | 'rtl' | 'auto'>('rtl')
const align = ref<'start' | 'center' | 'end'>('start')
const w = ref(200)
const h = ref(150)

const photo =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600'>" +
  "<rect width='800' height='600' fill='%234f46e5'/>" +
  "<circle cx='400' cy='300' r='180' fill='%23fbbf24'/></svg>"
</script>

<template>
  <p>
    <label>
      direction
      <select v-model="dir">
        <option>ltr</option>
        <option>rtl</option>
        <option>auto</option>
      </select>
    </label>
    ·
    <label>
      text-align
      <select v-model="align">
        <option>start</option>
        <option>center</option>
        <option>end</option>
      </select>
    </label>
  </p>
  <div class="editor">
    <!-- A block, not a <p>: the component renders a <div>, which a <p> cannot contain. -->
    <div :dir="dir" :style="{ textAlign: align }">
      {{ dir === 'ltr' ? 'Text before the image.' : 'טקסט לפני התמונה.' }}
      <DraggableResizable
        layout="flow"
        boundary=".editor"
        flow-anchor="auto"
        hide-anchored-handles
        lock-aspect-ratio
        v-model:w="w"
        v-model:h="h"
      >
        <img :src="photo" alt="A yellow circle" style="display: block; width: 100%; height: 100%" />
      </DraggableResizable>
    </div>
  </div>
</template>

<style scoped>
.editor {
  max-width: 480px;
  padding: 16px;
  border: 1px solid #999;
}
</style>
