<script setup lang="ts">
import { ref } from 'vue'
import { DraggableResizable } from 'vue-drag-resize-kit'

import 'vue-drag-resize-kit/style.css'

const w = ref(240)
const h = ref(180)
// Scales the height along, like `lock-aspect-ratio` does.
const resizeTo = (width: number) => {
  h.value = (h.value * width) / w.value
  w.value = width
}

const photo =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600'>" +
  "<rect width='800' height='600' fill='%234f46e5'/>" +
  "<circle cx='400' cy='300' r='180' fill='%23fbbf24'/></svg>"
</script>

<template>
  <p>
    Tab to the image, then use the arrow keys (<kbd>Shift</kbd> for ten steps), <kbd>Home</kbd> /
    <kbd>End</kbd> and <kbd>Escape</kbd>.
  </p>
  <div class="editor">
    <DraggableResizable
      layout="flow"
      boundary=".editor"
      lock-aspect-ratio
      keyboard
      aria-label="Image"
      aria-role-description="resizable image"
      :ariaSizeText="(w, h) => `${Math.round(w)} by ${Math.round(h)} pixels`"
      v-model:w="w"
      v-model:h="h"
    >
      <img :src="photo" alt="A yellow circle" style="display: block; width: 100%; height: 100%" />
    </DraggableResizable>
  </div>
  <div class="toolbar" role="toolbar" aria-label="Image size" @pointerdown.stop>
    <button @click="resizeTo(120)">Small</button>
    <button @click="resizeTo(240)">Medium</button>
    <button @click="resizeTo(400)">Large</button>
  </div>
</template>

<style scoped>
.editor {
  max-width: 480px;
  padding: 16px;
  border: 1px solid #999;
}

.toolbar {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}
</style>
