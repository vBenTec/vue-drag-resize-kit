<!--
  The live demo in the home page hero. `pnpm docs:screenshot` renders it into the README images
  (docs/public/hero-*.png), so changing it changes them too.
-->
<script setup lang="ts">
import { DraggableContainer, DraggableResizable } from 'vue-drag-resize-kit'
</script>

<template>
  <div class="hero-demo">
    <DraggableContainer>
      <DraggableResizable :x="36" :y="70" :init-w="104" :init-h="90" lock-aspect-ratio parent>
        <svg class="logo" viewBox="0 0 261.76 226.69" aria-hidden="true">
          <path d="M161.1 0 130.87 52.35 100.65 0H0l130.87 226.69L261.76 0z" fill="#41b883" />
          <path d="M161.1 0 130.87 52.35 100.65 0H52.35l78.52 136.01L209.4 0z" fill="#34495e" />
        </svg>
      </DraggableResizable>
      <DraggableResizable
        :x="180"
        :y="70"
        :init-w="104"
        :init-h="90"
        lock-aspect-ratio
        parent
        :active="true"
      >
        <svg class="logo" viewBox="0 0 261.76 226.69" aria-hidden="true">
          <path d="M161.1 0 130.87 52.35 100.65 0H0l130.87 226.69L261.76 0z" fill="#41b883" />
          <path d="M161.1 0 130.87 52.35 100.65 0H52.35l78.52 136.01L209.4 0z" fill="#34495e" />
        </svg>
      </DraggableResizable>
    </DraggableContainer>
    <p class="hint">Drag, resize, snap.</p>
  </div>
</template>

<style scoped>
.hero-demo {
  position: relative;
  z-index: 1;
  box-sizing: border-box;
  width: 320px;
  height: 240px;
  margin: auto;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background: var(--vp-c-bg-soft);
  user-select: none;
}

.logo {
  display: block;
  width: 100%;
  height: 100%;
}

.hint {
  position: absolute;
  right: 0;
  bottom: 10px;
  left: 0;
  margin: 0;
  color: var(--vp-c-text-2);
  font-size: 13px;
  text-align: center;
  pointer-events: none;
}
</style>
