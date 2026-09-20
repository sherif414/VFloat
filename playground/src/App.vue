<script setup lang="ts">
import { ref, shallowRef } from "vue";
import {
  usePosition,
  useHover,
  useRole,
  useOutsideClick,
  offset,
  flip,
  shift,
  type Placement,
} from "v-float";

const isOpen = ref(false);
const placement = ref<Placement>("bottom");
const offsetValue = ref(8);

const anchorRef = shallowRef<HTMLElement | null>(null);
const floatingRef = shallowRef<HTMLElement | null>(null);

const { floatingStyles, actualPlacement } = usePosition(anchorRef, floatingRef, {
  placement,
  open: isOpen,
  middleware: [offset(() => offsetValue.value), flip(), shift({ padding: 8 })],
});

useHover({
  open: isOpen,
  onOpenChange: (val) => {
    isOpen.value = val;
  },
  elements: {
    reference: anchorRef,
    floating: floatingRef,
  },
});

useOutsideClick({
  open: isOpen,
  onOutsideClick: () => {
    isOpen.value = false;
  },
  elements: {
    reference: anchorRef,
    floating: floatingRef,
  },
});

useRole({
  role: "tooltip",
  open: isOpen,
  elements: {
    reference: anchorRef,
    floating: floatingRef,
  },
});

const placements: Placement[] = [
  "top",
  "top-start",
  "top-end",
  "bottom",
  "bottom-start",
  "bottom-end",
  "left",
  "left-start",
  "left-end",
  "right",
  "right-start",
  "right-end",
];
</script>

<template>
  <main class="playground-container">
    <header class="header">
      <h1>VFloat Playground</h1>
      <p>Interactive testing sandbox for VFloat composables.</p>
    </header>

    <section class="controls">
      <label>
        Placement:
        <select v-model="placement">
          <option v-for="p in placements" :key="p" :value="p">{{ p }}</option>
        </select>
      </label>

      <label>
        Offset:
        <input v-model.number="offsetValue" type="number" min="0" max="40" />
      </label>

      <span class="actual-placement">
        Resolved: <strong>{{ actualPlacement }}</strong>
      </span>
    </section>

    <div class="sandbox-stage">
      <button ref="anchorRef" class="anchor-btn">Hover Me</button>

      <div v-if="isOpen" ref="floatingRef" :style="floatingStyles" class="floating-card">
        <div class="card-content">
          <strong>Floating Element</strong>
          <p>Placement: {{ actualPlacement }}</p>
        </div>
      </div>
    </div>
  </main>
</template>

<style>
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family:
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    Roboto,
    Oxygen,
    Ubuntu,
    Cantarell,
    sans-serif;
  background-color: #0d1117;
  color: #e6edf3;
}

.playground-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem 1rem;
}

.header {
  margin-bottom: 2rem;
  border-bottom: 1px solid #30363d;
  padding-bottom: 1rem;
}

.header h1 {
  margin: 0 0 0.5rem 0;
  font-size: 1.8rem;
  color: #58a6ff;
}

.controls {
  display: flex;
  gap: 1.5rem;
  align-items: center;
  margin-bottom: 3rem;
  padding: 1rem;
  background-color: #161b22;
  border: 1px solid #30363d;
  border-radius: 8px;
}

.controls select,
.controls input {
  margin-left: 0.5rem;
  background-color: #0d1117;
  color: #e6edf3;
  border: 1px solid #30363d;
  padding: 0.35rem 0.65rem;
  border-radius: 4px;
}

.actual-placement {
  margin-left: auto;
  font-size: 0.9rem;
  color: #8b949e;
}

.actual-placement strong {
  color: #3fb950;
}

.sandbox-stage {
  min-height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px dashed #30363d;
  border-radius: 12px;
  position: relative;
}

.anchor-btn {
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  font-weight: 600;
  color: #ffffff;
  background-color: #1f6feb;
  border: 1px solid rgba(240, 246, 252, 0.1);
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.anchor-btn:hover {
  background-color: #388bfd;
}

.floating-card {
  z-index: 50;
  background-color: #21262d;
  color: #e6edf3;
  border: 1px solid #484f58;
  border-radius: 8px;
  padding: 0.75rem 1rem;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  pointer-events: auto;
}

.card-content strong {
  display: block;
  font-size: 0.9rem;
  margin-bottom: 0.25rem;
}

.card-content p {
  margin: 0;
  font-size: 0.8rem;
  color: #8b949e;
}
</style>
