<template>
  <div class="custom-home">
    <!-- Hero Section -->
    <div class="hero-section">
      <div class="hero-content">
        <h1 class="hero-title">
          VFloat: Build
          <span class="highlight">Seamless Floating Elements</span>
        </h1>
        <p class="hero-description">
          A robust, feature-rich toolkit for pixel-perfect placement of
          tooltips, dropdowns, popovers, and any custom floating elements, built
          specifically for Vue 3.
        </p>

        <div class="hero-actions">
          <a href="/guide/" class="action-button primary"> Get Started </a>
          <a href="/examples/" class="action-button secondary">
            Browse Examples
          </a>
        </div>
      </div>
    </div>

    <!-- Interactive Demo Section -->
    <div class="demo-section">
      <div class="demo-tabs">
        <button
          v-for="demo in demos"
          :key="demo.id"
          :class="['demo-tab', { active: activeDemo === demo.id }]"
          @click="activeDemo = demo.id"
        >
          {{ demo.name }}
        </button>
      </div>

      <div class="demo-showcase">
        <div class="demo-container">
          <!-- Tooltip Demo -->
          <div v-if="activeDemo === 'tooltip'" class="demo-content">
            <TooltipDemo />
          </div>

          <!-- Dropdown Demo -->
          <div v-if="activeDemo === 'dropdown'" class="demo-content">
            <DropdownDemo />
          </div>

          <!-- Popover Demo -->
          <div v-if="activeDemo === 'popover'" class="demo-content">
            <PopoverDemo />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import TooltipDemo from "./demos/TooltipDemo.vue";
import DropdownDemo from "./demos/DropdownDemo.vue";
import PopoverDemo from "./demos/PopoverDemo.vue";

const demos = [
  { id: "tooltip", name: "Tooltip" },
  { id: "dropdown", name: "Dropdown" },
  { id: "popover", name: "Popover" },
];

const activeDemo = ref(demos[0].id);
</script>

<style scoped>
.custom-home {
  margin-top: calc(-1 * var(--vp-nav-height));
  background: var(--vp-c-bg);
}

/* Hero Section */
.hero-section {
  padding: 8rem 2rem 4rem;
  text-align: center;
  background: var(--vp-c-bg);
  border-bottom: 1px solid var(--vp-c-divider-light);
}

.hero-content {
  max-width: 900px;
  margin: 0 auto;
}

.hero-title {
  font-size: clamp(2.5rem, 6vw, 4rem);
  font-weight: 700;
  line-height: 1.1;
  margin-bottom: 1.5rem;
  color: var(--vp-c-text-1);
}

.highlight {
  background: linear-gradient(135deg, var(--vp-c-brand-1), var(--vp-c-brand-2));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-description {
  font-size: clamp(1.125rem, 2.5vw, 1.375rem);
  line-height: 1.6;
  color: var(--vp-c-text-2);
  margin-bottom: 2.5rem;
  max-width: 700px;
  margin-left: auto;
  margin-right: auto;
}

.hero-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.action-button {
  padding: 0.625rem 1.5rem;
  border-radius: 8px;
  font-weight: 500;
  text-decoration: none;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.action-button.primary {
  background: var(--vp-c-text-1);
  color: var(--vp-c-bg);
  border: 1px solid var(--vp-c-text-1);
}

.action-button.primary:hover {
  background: var(--vp-c-text-2);
  border-color: var(--vp-c-text-2);
}

.action-button.secondary {
  background: transparent;
  color: var(--vp-c-text-1);
  border: 1px solid var(--vp-c-divider);
}

.action-button.secondary:hover {
  border-color: var(--vp-c-text-1);
}

/* Demo Section */
.demo-section {
  padding: 4rem 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.demo-tabs {
  display: flex;
  gap: 0;
  margin-bottom: 2rem;
  border-bottom: 1px solid var(--vp-c-divider);
  flex-wrap: wrap;
  overflow-x: visible;
}

.demo-tab {
  position: relative;
  padding: 1rem 1.5rem;
  background: none;
  border: none;
  color: var(--vp-c-text-2);
  font-weight: 500;
  cursor: pointer;
  transition: color 0.3s ease;
  white-space: nowrap;
  border-bottom: 2px solid transparent;
}

.demo-tab:hover {
  color: var(--vp-c-text-1);
}

.demo-tab::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  right: 0;
  height: 2px;
  background-color: var(--vp-c-brand-1);
  transform: scaleX(0);
  transform-origin: center;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.demo-tab.active {
  color: var(--vp-c-text-1);
}

.demo-tab.active::after {
  transform: scaleX(1);
}

.demo-showcase {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  overflow: hidden;
}

.demo-container {
  padding: 3rem;
  min-height: 600px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.demo-content {
  width: 100%;
  display: flex;
  justify-content: center;
}

/* Responsive */
@media (max-width: 768px) {
  .hero-section {
    padding: 6rem 1rem 2rem;
  }

  .demo-section {
    padding: 2rem 1rem;
  }

  .demo-container {
    padding: 2rem 1rem;
    min-height: 250px;
  }

  .hero-actions {
    flex-direction: column;
    align-items: center;
  }

  .action-button {
    width: 100%;
    max-width: 200px;
    justify-content: center;
  }
}
</style>
