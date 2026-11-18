<script setup lang="ts">
import { ref } from 'vue'
import { DraggableResizable, type DragPayload, type ResizePayload } from 'vue-drag-resize-kit'

import 'vue-drag-resize-kit/style.css'

const log = ref<string[]>([])

const print = (event: string, payload?: DragPayload | ResizePayload) => {
  const values = payload ? Object.values(payload).map((value) => Math.round(value)) : []
  log.value = [`${event} ${values.join(', ')}`, ...log.value].slice(0, 8)
}
</script>

<template>
  <div class="layout">
    <div class="area">
      <DraggableResizable
        :x="40"
        :y="40"
        :init-w="120"
        :init-h="80"
        parent
        @activated="print('activated')"
        @deactivated="print('deactivated')"
        @drag-start="print('drag-start', $event)"
        @drag-end="print('drag-end', $event)"
        @resize-start="print('resize-start', $event)"
        @resize-end="print('resize-end', $event)"
      >
        <div class="box">Click, drag or resize me</div>
      </DraggableResizable>
    </div>
    <ol class="log" aria-label="Events, newest first">
      <li v-for="(entry, index) in log" :key="index">
        <code>{{ entry }}</code>
      </li>
    </ol>
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.area {
  position: relative;
  width: 300px;
  height: 220px;
  border: 1px dashed #999;
}

.box {
  box-sizing: border-box;
  display: grid;
  place-items: center;
  height: 100%;
  padding: 4px;
  background: #42b88333;
  text-align: center;
}

.log {
  min-width: 200px;
  margin: 0;
  padding: 0;
  list-style: none;
}
</style>
