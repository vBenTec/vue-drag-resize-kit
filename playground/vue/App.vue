<template>
  <div id="app">
    <div>
      x:{{ state.x }}
      <button @click="state.x += 10">+</button>
      <button @click="state.x -= 10">-</button>
    </div>
    <div>
      y:{{ state.y }}
      <button @click="state.y += 10">+</button>
      <button @click="state.y -= 10">-</button>
    </div>
    <div>
      w:{{ state.w }}
      <button @click="state.w += 10">+</button>
      <button @click="state.w -= 10">-</button>
    </div>
    <div>
      h: {{ state.h }}
      <button @click="state.h += 10">+</button>
      <button @click="state.h -= 10">-</button>
    </div>
    <div>active:{{ state.active }}<br /></div>

    <h2>Parent bounds, locked aspect ratio</h2>
    <div class="parent">
      <DraggableResizable
        :initW="40"
        :initH="80"
        v-model:x="state.x"
        v-model:y="state.y"
        v-model:w="state.w"
        v-model:h="state.h"
        v-model:active="state.active"
        :draggable="true"
        :resizable="true"
        :parent="true"
        :disabledX="false"
        :disabledW="false"
        :disabledH="false"
        :disabledY="false"
        :lockAspectRatio="true"
        @activated="print('activated')"
        @deactivated="print('deactivated')"
        @drag-start="print('drag-start', $event)"
        @resize-start="print('resize-start', $event)"
        @dragging="print('dragging', $event)"
        @resizing="print('resizing', $event)"
        @drag-end="print('drag-end', $event)"
        @resize-end="print('resize-end', $event)"
      >
        Example
      </DraggableResizable>
    </div>

    <h2>Inline image in rich text (flow layout)</h2>
    <div>
      image w: {{ image.w.toFixed(2) }} / h: {{ image.h.toFixed(2) }} — last resize-end:
      {{ image.lastResizeEnd ?? '—' }}
      <button @click="((image.w = 0), (image.h = 0))">reset to natural size</button>
    </div>
    <div class="editor">
      <p>
        A paragraph before the image. The image sits in normal document flow: it keeps its place in
        the text, and the paragraph below moves as it grows and shrinks.
      </p>
      <DraggableResizable
        layout="flow"
        boundary=".editor"
        lockAspectRatio
        v-model:w="image.w"
        v-model:h="image.h"
        v-model:active="image.active"
        @resize-end="image.lastResizeEnd = `${$event.w.toFixed(1)} × ${$event.h.toFixed(1)}`"
      >
        <img :src="imageSrc" alt="Example" style="display: block; width: 100%; height: 100%" />
      </DraggableResizable>
      <p>
        A paragraph after the image. Resize from any handle — the width is capped at this editor
        column's content width (the <code>boundary</code>), the height follows the aspect ratio.
      </p>
    </div>

    <h2>Snapping container</h2>
    <div class="parent">
      <DraggableContainer>
        <DraggableResizable
          :initW="40"
          :initH="80"
          v-model:x="state.x"
          v-model:y="state.y"
          v-model:w="state.w"
          v-model:h="state.h"
          v-model:active="state.active"
          :draggable="true"
          :resizable="true"
          :parent="true"
          :disabledX="false"
          :disabledW="false"
          :disabledH="false"
          :disabledY="false"
          :lockAspectRatio="true"
          @activated="print('activated')"
          @deactivated="print('deactivated')"
          @drag-start="print('drag-start', $event)"
          @resize-start="print('resize-start', $event)"
          @dragging="print('dragging', $event)"
          @resizing="print('resizing', $event)"
          @drag-end="print('drag-end', $event)"
          @resize-end="print('resize-end', $event)"
        >
          Example
        </DraggableResizable>

        <DraggableResizable
          :initW="40"
          :initH="80"
          :draggable="true"
          :resizable="true"
          :parent="true"
          :disabledX="false"
          :disabledW="false"
          :disabledH="false"
          :disabledY="false"
          :lockAspectRatio="true"
        >
          Example
        </DraggableResizable>

        <DraggableResizable
          :initW="40"
          :initH="80"
          :x="100"
          :draggable="true"
          :resizable="true"
          :parent="true"
          :disabledX="false"
          :disabledW="false"
          :disabledH="false"
          :disabledY="false"
          :lockAspectRatio="true"
        >
          Example
        </DraggableResizable>
      </DraggableContainer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue'

import { DraggableContainer, DraggableResizable } from '../../src'
import type { DragPayload, ResizePayload } from '../../src'

const state = reactive({
  x: 100,
  y: 100,
  h: 100,
  w: 100,
  active: false,
})

const image = reactive({
  w: 0,
  h: 0,
  active: false,
  lastResizeEnd: null as string | null,
})

const imageSrc =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600'>" +
  "<rect width='800' height='600' fill='%234f46e5'/>" +
  "<circle cx='400' cy='300' r='180' fill='%23fbbf24'/></svg>"

const print = (msg: string, payload?: DragPayload | ResizePayload) => {
  console.log(msg, payload ?? '')
}
</script>

<style scoped>
.editor {
  width: 480px;
  padding: 16px;
  border: 1px solid #999;
  font-family: sans-serif;
  line-height: 1.5;
}

.parent {
  width: 300px;
  height: 300px;

  /*
    position: absolute;
    top: 100px;
    left: 200px;
  */
  position: relative;
  border: 1px solid #000;
  user-select: none;
}
</style>
