<script setup lang="ts">
import { ref } from 'vue'
import { DraggableResizable, type ResizePayload } from 'vue-drag-resize-kit'

import 'vue-drag-resize-kit/style.css'

const w = ref(0) // 0 = natural: the image renders at its responsive size
const h = ref(0)
const saved = ref('—')

// Persist here, rounded: the models stay verbatim (see Natural sizing).
const persist = (size: ResizePayload) =>
  (saved.value = `${Math.round(size.w)} × ${Math.round(size.h)}`)
const reset = () => {
  w.value = 0
  h.value = 0
}

const photo =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='320' height='240'>" +
  "<rect width='320' height='240' fill='%234f46e5'/>" +
  "<circle cx='160' cy='120' r='72' fill='%23fbbf24'/></svg>"
</script>

<template>
  <p>
    w: {{ w.toFixed(2) }} · h: {{ h.toFixed(2) }} · last resize-end: {{ saved }}
    <button @click="reset">Reset to natural size</button>
  </p>
  <div class="editor">
    <p>Some text before the image. It keeps its place in the text…</p>
    <DraggableResizable
      layout="flow"
      boundary=".editor"
      lock-aspect-ratio
      v-model:w="w"
      v-model:h="h"
      @resize-end="persist"
    >
      <img :src="photo" alt="A yellow circle" style="display: block; width: 100%; height: 100%" />
    </DraggableResizable>
    <p>…and the text after it moves down as the image grows.</p>
  </div>
</template>

<style scoped>
.editor {
  max-width: 480px;
  padding: 16px;
  border: 1px solid #999;
}
</style>
