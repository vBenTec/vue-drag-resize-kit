<script setup lang="ts">
import { ref } from 'vue'
import { DraggableResizable } from 'vue-drag-resize-kit'

import 'vue-drag-resize-kit/style.css'

const columnWidth = ref(360)
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
      Column width
      <input v-model.number="columnWidth" type="range" min="200" max="520" />
      {{ columnWidth }}px
    </label>
    · image: {{ Math.round(w) }} × {{ Math.round(h) }}
  </p>
  <div class="column" :style="{ width: `${columnWidth}px` }">
    <div class="cell">
      <DraggableResizable
        layout="flow"
        boundary=".column"
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
.column {
  padding: 16px;
  border: 1px solid #999;
}

.cell {
  padding: 8px;
  border: 1px dotted #999;
}
</style>
