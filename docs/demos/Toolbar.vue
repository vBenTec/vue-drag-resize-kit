<script setup lang="ts">
import { ref } from 'vue'
import { DraggableResizable, type ResizePayload, type ToolbarPlacement } from 'vue-drag-resize-kit'

import 'vue-drag-resize-kit/style.css'

const w = ref(240)
const h = ref(180)
const placement = ref<ToolbarPlacement>('bottom')
const saved = ref('—')

// Presets go through `resizeTo`, so this one handler persists them like any other resize.
const save = (size: ResizePayload) =>
  (saved.value = `${Math.round(size.w)} × ${Math.round(size.h)}`)

const photo =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600'>" +
  "<rect width='800' height='600' fill='%234f46e5'/>" +
  "<circle cx='400' cy='300' r='180' fill='%23fbbf24'/></svg>"
</script>

<template>
  <p>
    <label>
      toolbar-placement
      <select v-model="placement">
        <option>bottom</option>
        <option>top</option>
        <option>auto</option>
      </select>
    </label>
    · last resize-end: {{ saved }}
  </p>
  <div class="editor">
    <DraggableResizable
      layout="flow"
      boundary=".editor"
      lock-aspect-ratio
      keyboard
      aria-label="Image"
      toolbar-label="Image size"
      :toolbar-placement="placement"
      v-model:w="w"
      v-model:h="h"
      @resize-end="save"
    >
      <img :src="photo" alt="A yellow circle" style="display: block; width: 100%; height: 100%" />
      <template #toolbar="{ resizeTo, deactivate }">
        <button @click="resizeTo({ w: 120 })">Small</button>
        <button @click="resizeTo({ w: 240 })">Medium</button>
        <button @click="resizeTo({ w: Infinity })">Best fit</button>
        <button @click="deactivate">Done</button>
      </template>
    </DraggableResizable>
  </div>
</template>

<style scoped>
.editor {
  max-width: 480px;
  padding: 16px 16px 56px;
  border: 1px solid #999;
}

/* The toolbar wrapper is rendered by the component: reach it with :deep(). */
.editor :deep(.vdr-toolbar) {
  display: flex;
  gap: 4px;
}
</style>
