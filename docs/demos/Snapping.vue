<script setup lang="ts">
import { ref } from 'vue'
import { DraggableContainer, DraggableResizable } from 'vue-drag-resize-kit'

import 'vue-drag-resize-kit/style.css'

const snapToParent = ref(true)
const showGuides = ref(true)
</script>

<template>
  <div class="controls">
    <label><input v-model="snapToParent" type="checkbox" /> snap-to-parent</label>
    <label><input v-model="showGuides" type="checkbox" /> show-guides</label>
    <span>Custom guides at x = 100 and x = 200</span>
  </div>
  <div class="parent">
    <div class="marker" style="left: 100px" />
    <div class="marker" style="left: 200px" />
    <DraggableContainer
      :guides-x="[100, 200]"
      :snap-to-parent="snapToParent"
      :show-guides="showGuides"
    >
      <DraggableResizable :init-w="80" :init-h="80" :x="20" :y="20">
        <div class="box">One</div>
      </DraggableResizable>
      <DraggableResizable :init-w="80" :init-h="80" :x="150" :y="120">
        <div class="box">Two</div>
      </DraggableResizable>
      <DraggableResizable :init-w="120" :init-h="60" :x="260" :y="200" :draggable="false">
        <div class="box">Not draggable, still a target</div>
      </DraggableResizable>
    </DraggableContainer>
  </div>
</template>

<style scoped>
.controls {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
  margin-bottom: 16px;
}

.parent {
  position: relative;
  width: 400px;
  height: 300px;
  border: 1px dashed #999;
}

/* Where the custom guides are, for the demo only. */
.marker {
  position: absolute;
  top: 0;
  bottom: 0;
  border-left: 1px dotted #647eff;
  pointer-events: none;
}

.box {
  box-sizing: border-box;
  display: grid;
  place-items: center;
  height: 100%;
  padding: 4px;
  background: #42b88333;
  font-size: 12px;
  text-align: center;
}
</style>
