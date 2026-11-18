<script setup lang="ts">
import { reactive } from 'vue'
import { DraggableResizable } from 'vue-drag-resize-kit'

import 'vue-drag-resize-kit/style.css'

const options = reactive({
  parent: true,
  lockAspectRatio: false,
  disabledX: false,
  disabledY: false,
  resizable: true,
})
</script>

<template>
  <div class="controls">
    <label v-for="(_, name) in options" :key="name">
      <input v-model="options[name]" type="checkbox" /> {{ name }}
    </label>
  </div>
  <div class="area">
    <DraggableResizable
      :x="40"
      :y="40"
      :init-w="120"
      :init-h="80"
      :min-w="60"
      :min-h="40"
      :max-w="240"
      :max-h="180"
      v-bind="options"
    >
      <div class="box">60–240 × 40–180</div>
    </DraggableResizable>
  </div>
</template>

<style scoped>
.controls {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
  margin-bottom: 16px;
}

.area {
  position: relative;
  width: 400px;
  height: 260px;
  border: 1px dashed #999;
}

.box {
  display: grid;
  place-items: center;
  height: 100%;
  background: #42b88333;
}
</style>
