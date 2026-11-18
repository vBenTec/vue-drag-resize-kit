<script setup lang="ts">
import { ref } from 'vue'
import { DraggableResizable, type DragPayload } from 'vue-drag-resize-kit'

import 'vue-drag-resize-kit/style.css'

const x = ref(100)
const y = ref(100)
const w = ref(120)
const h = ref(80)
const active = ref(false)
const droppedAt = ref('—')

const onDragEnd = (payload: DragPayload) => (droppedAt.value = `${payload.x}, ${payload.y}`)
</script>

<template>
  <p>
    x: {{ x }} · y: {{ y }} · w: {{ w }} · h: {{ h }} · active: {{ active }} · dropped at:
    {{ droppedAt }}
  </p>
  <div class="parent">
    <DraggableResizable
      v-model:x="x"
      v-model:y="y"
      v-model:w="w"
      v-model:h="h"
      v-model:active="active"
      parent
      @drag-end="onDragEnd"
    >
      Drag me
    </DraggableResizable>
  </div>
</template>

<style>
.parent {
  position: relative;
  width: 400px;
  height: 300px;
  border: 1px dashed #999;
}
</style>
