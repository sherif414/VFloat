<script setup lang="ts">
import { ref } from "vue";
import Demo from "./demo/Demo.vue";
import TreeViewDemo from "./demo/TreeViewDemo.vue";

const activeTab = ref<"floating" | "recursive">("recursive");
</script>

<template>
  <div class="app-layout">
    <!-- Premium glassmorphic switcher -->
    <nav class="demo-nav">
      <div class="nav-container">
        <button
          type="button"
          class="nav-tab"
          :class="{ 'is-active': activeTab === 'recursive' }"
          @click="activeTab = 'recursive'"
        >
          Recursive Tree Demo
        </button>
        <button
          type="button"
          class="nav-tab"
          :class="{ 'is-active': activeTab === 'floating' }"
          @click="activeTab = 'floating'"
        >
          Floating Menu Demo
        </button>
      </div>
    </nav>

    <!-- Main demo screen -->
    <main class="demo-screen">
      <TreeViewDemo v-if="activeTab === 'recursive'" />
      <Demo v-else />
    </main>
  </div>
</template>

<style>
/* Reset and global styles */
body {
  margin: 0;
  padding: 0;
  background-color: #f8fafc;
}
</style>

<style scoped>
.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.demo-nav {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  justify-content: center;
  padding: 16px;
  background: rgba(248, 250, 252, 0.8);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(24, 121, 118, 0.08);
}

.nav-container {
  display: flex;
  background: #e2e8f0;
  padding: 4px;
  border-radius: 9999px;
  gap: 4px;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.05);
}

.nav-tab {
  font-family: "Inter", system-ui, sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
  padding: 8px 18px;
  border-radius: 9999px;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.nav-tab:hover {
  color: #1e293b;
}

.nav-tab.is-active {
  background: #ffffff;
  color: #147976;
  box-shadow:
    0 4px 10px rgba(20, 121, 118, 0.1),
    0 2px 4px rgba(0, 0, 0, 0.05);
}

.demo-screen {
  flex-grow: 1;
  display: flex;
  justify-content: center;
  align-items: start;
}
</style>
