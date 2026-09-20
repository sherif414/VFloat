<script setup lang="ts">
import { computed, onWatcherCleanup, shallowRef, watchPostEffect } from "vue";
import OutsideClickDemo from "./demos/OutsideClickDemo.vue";
import MenuDemo from "./demos/MenuDemo.vue";
import TypeaheadDemo from "./demos/TypeaheadDemo.vue";
import Temp from "./demos/Temp.vue";

interface DemoEntry {
  id: string;
  title: string;
  component: unknown;
}

const demos: DemoEntry[] = [
  {
    id: "outside-click",
    title: "Outside click stack",
    component: OutsideClickDemo,
  },
  {
    id: "Temp",
    title: "Temp",
    component: Temp,
  },
  {
    id: "menu",
    title: "Nested menu",
    component: MenuDemo,
  },
  {
    id: "typeahead",
    title: "Typeahead",
    component: TypeaheadDemo,
  },
];

const activeId = shallowRef(demos[0]!.id);
const activeDemo = computed(() => demos.find((demo) => demo.id === activeId.value) ?? demos[0]!);
</script>

<template>
  <div class="canvas">
    <header class="canvas__brand">
      <span class="canvas__mark">◈</span>
      <span class="canvas__name">VFloat <em>canvas</em></span>
    </header>

    <main class="canvas__stage">
      <Transition name="demo-fade" mode="out-in">
        <div :key="activeDemo.id" class="canvas__demo">
          <component :is="activeDemo.component" />
        </div>
      </Transition>
    </main>

    <nav class="floatbar" aria-label="Switch demo">
      <div class="floatbar__items">
        <button
          v-for="demo in demos"
          :key="demo.id"
          type="button"
          class="floatbar__item"
          :data-active="demo.id === activeId"
          @click="activeId = demo.id"
        >
          <span class="floatbar__dot" />
          {{ demo.title }}
        </button>
      </div>
      <span class="floatbar__sep" />
      <span class="floatbar__hint">{{ demos.length }} demo{{ demos.length === 1 ? "" : "s" }}</span>
    </nav>
  </div>
</template>

<style>
html,
body {
  margin: 0;
  background: #08090a;
  color: #f7f8f8;
  font-family:
    Inter,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
}
#app {
  min-height: 100vh;
}
</style>

<style scoped>
.canvas {
  position: relative;
  min-height: 100vh;
  overflow: clip;
  /* Open-canvas dot grid */
  background-image: radial-gradient(rgba(255, 255, 255, 0.09) 1px, transparent 1px);
  background-size: 24px 24px;
}
/* Soft vignette so the edges fall away */
.canvas::before {
  content: "";
  position: fixed;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(
    ellipse 90% 70% at 50% 40%,
    transparent 40%,
    rgba(8, 9, 10, 0.85) 100%
  );
}
.canvas__brand {
  position: absolute;
  top: 20px;
  left: 24px;
  display: flex;
  align-items: center;
  gap: 9px;
  z-index: 5;
}
.canvas__mark {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 7px;
  background: #5e6ad2;
  font-size: 13px;
}
.canvas__name {
  font-size: 13px;
  font-weight: 600;
}
.canvas__name em {
  font-style: normal;
  font-weight: 400;
  color: rgba(247, 248, 248, 0.4);
}
.canvas__stage {
  display: flex;
  justify-content: center;
  padding: 96px 24px 140px;
}
.canvas__demo {
  width: 100%;
  max-width: 640px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  background: rgba(13, 14, 17, 0.85);
  backdrop-filter: blur(8px);
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.5);
  padding: 24px;
}
.demo-fade-enter-active,
.demo-fade-leave-active {
  transition:
    opacity 0.16s ease,
    transform 0.16s ease;
}
.demo-fade-enter-from,
.demo-fade-leave-to {
  opacity: 0;
  transform: translateY(6px);
}
.floatbar {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 50;
  display: flex;
  align-items: center;
  gap: 4px;
  max-width: min(92vw, 720px);
  padding: 6px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(22, 24, 29, 0.9);
  backdrop-filter: blur(12px);
  box-shadow:
    0 16px 48px rgba(0, 0, 0, 0.6),
    0 0 0 1px rgba(0, 0, 0, 0.4);
}
/* Scrollable strip so the bar holds many demos without growing off-canvas */
.floatbar__items {
  display: flex;
  align-items: center;
  gap: 4px;
  overflow-x: auto;
  scrollbar-width: none;
  mask-image: linear-gradient(to right, black 92%, transparent 100%);
  padding-right: 8px;
}
.floatbar__items::-webkit-scrollbar {
  display: none;
}
.floatbar__item {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-shrink: 0;
  padding: 7px 10px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: rgba(247, 248, 248, 0.65);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
}
.floatbar__item:hover {
  background: rgba(255, 255, 255, 0.07);
  color: #f7f8f8;
}
.floatbar__item[data-active="true"] {
  background: rgba(94, 106, 210, 0.18);
  color: #bec6ff;
}
.floatbar__dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: currentColor;
  opacity: 0.6;
}
.floatbar__item kbd {
  font-family: inherit;
  font-size: 11px;
  padding: 1px 5px;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.06);
  color: rgba(247, 248, 248, 0.5);
}
.floatbar__sep {
  width: 1px;
  align-self: stretch;
  flex-shrink: 0;
  margin: 6px 2px;
  background: rgba(255, 255, 255, 0.09);
}
.floatbar__hint {
  padding: 0 10px 0 6px;
  flex-shrink: 0;
  font-size: 11px;
  color: rgba(247, 248, 248, 0.35);
  white-space: nowrap;
}
</style>
