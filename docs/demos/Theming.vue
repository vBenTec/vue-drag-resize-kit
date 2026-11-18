<script setup lang="ts">
import { ref } from 'vue'
import { DraggableResizable } from 'vue-drag-resize-kit'

import 'vue-drag-resize-kit/style.css'

const theme = ref<'default' | 'indigo' | 'gmail'>('gmail')

const photo =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600'>" +
  "<rect width='800' height='600' fill='%234f46e5'/>" +
  "<circle cx='400' cy='300' r='180' fill='%23fbbf24'/></svg>"
</script>

<template>
  <p>
    <label>
      Theme
      <select v-model="theme">
        <option value="default">Default</option>
        <option value="indigo">Indigo</option>
        <option value="gmail">Gmail-like</option>
      </select>
    </label>
    · Click the image to select it.
  </p>
  <div class="editor" :class="theme">
    <DraggableResizable layout="flow" lock-aspect-ratio :init-w="200" :init-h="150" active>
      <img :src="photo" alt="A yellow circle" style="display: block; width: 100%; height: 100%" />
    </DraggableResizable>
  </div>
</template>

<style scoped>
.editor {
  padding: 24px;
}

.indigo {
  --vdr-border-color: #4f46e5;
  --vdr-handle-size: 10px;
  --vdr-handle-background: #fff;
  --vdr-handle-border-color: #4f46e5;
}

.gmail {
  --vdr-border-offset: 0; /* dashed line just outside the image */
  --vdr-border-color: #4f46e5;
  --vdr-handle-size: 10px;
  --vdr-handle-background: #4f46e5; /* solid square */
  --vdr-handle-border-color: #fff; /* white contrast border */
  --vdr-handle-border-width: 2px;
  --vdr-handle-hit-size: 24px; /* see Accessibility */
}
</style>
