<!-- .vitepress/theme/components/CustomHome.vue -->
<template>
  <div class="custom-home">
    <!-- Hero Section -->
    <div class="hero-section">
      <div class="hero-content">
        <h1 class="hero-title">
          VFloat: Build <span class="highlight">Seamless Floating Elements</span>
        </h1>
        <p class="hero-description">
          A robust, feature-rich toolkit for pixel-perfect placement of tooltips, dropdowns,
          popovers, and any custom floating elements, built specifically for Vue 3.
        </p>

        <div class="hero-actions">
          <a href="/guide/" class="action-button primary"> Get Started </a>
          <a href="/examples/" class="action-button secondary"> Browse Examples </a>
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
            <div class="demo-preview">
              <div class="tooltip-demo">
                <button
                  class="demo-button"
                  @mouseenter="showTooltip = true"
                  @mouseleave="showTooltip = false"
                  ref="tooltipTrigger"
                >
                  Hover me
                </button>
                <div v-if="showTooltip" class="tooltip floating-element" :style="tooltipStyle">
                  This tooltip is perfectly positioned!
                </div>
              </div>
            </div>
          </div>

          <!-- Dropdown Demo -->
          <div v-if="activeDemo === 'dropdown'" class="demo-content">
            <div class="demo-preview">
              <div class="dropdown-demo">
                <button
                  class="demo-button"
                  @click="showDropdown = !showDropdown"
                  ref="dropdownTrigger"
                >
                  Click me <span class="arrow">↓</span>
                </button>
                <div v-if="showDropdown" class="dropdown floating-element" :style="dropdownStyle">
                  <div class="dropdown-item">Edit profile</div>
                  <div class="dropdown-item">Settings</div>
                  <div class="dropdown-item">Sign out</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Popover Demo -->
          <div v-if="activeDemo === 'popover'" class="demo-content">
            <div class="demo-preview">
              <div class="popover-demo">
                <button
                  class="demo-button"
                  @click="showPopover = !showPopover"
                  ref="popoverTrigger"
                >
                  Open popover
                </button>
                <div v-if="showPopover" class="popover floating-element" :style="popoverStyle">
                  <div class="popover-header">
                    <h4>Positioning Options</h4>
                    <button @click="showPopover = false" class="close-btn">×</button>
                  </div>
                  <div class="popover-body">
                    Configure placement, offset, and behavior with simple props.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue"

const activeDemo = ref("tooltip")
const showTooltip = ref(false)
const showDropdown = ref(false)
const showPopover = ref(false)

const tooltipTrigger = ref(null)
const dropdownTrigger = ref(null)
const popoverTrigger = ref(null)

const demos = [
  { id: "tooltip", name: "Tooltip" },
  { id: "dropdown", name: "Dropdown" },
  { id: "popover", name: "Popover" },
]

// Simple positioning logic for demo purposes
const tooltipStyle = computed(() => {
  if (!tooltipTrigger.value) return {}
  const rect = tooltipTrigger.value.getBoundingClientRect()
  return {
    position: "fixed",
    top: `${rect.top - 40}px`,
    left: `${rect.left + rect.width / 2}px`,
    transform: "translateX(-50%)",
  }
})

const dropdownStyle = computed(() => {
  if (!dropdownTrigger.value) return {}
  const rect = dropdownTrigger.value.getBoundingClientRect()
  return {
    position: "fixed",
    top: `${rect.bottom + 8}px`,
    left: `${rect.left}px`,
    minWidth: `${rect.width}px`,
  }
})

const popoverStyle = computed(() => {
  if (!popoverTrigger.value) return {}
  const rect = popoverTrigger.value.getBoundingClientRect()
  return {
    position: "fixed",
    top: `${rect.bottom + 8}px`,
    left: `${rect.left}px`,
  }
})

// Close dropdowns when clicking outside
const handleClickOutside = (event) => {
  if (
    showDropdown.value &&
    dropdownTrigger.value &&
    !dropdownTrigger.value.contains(event.target)
  ) {
    showDropdown.value = false
  }
  if (showPopover.value && popoverTrigger.value && !popoverTrigger.value.contains(event.target)) {
    showPopover.value = false
  }
}

onMounted(() => {
  document.addEventListener("click", handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside)
})
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
  overflow-x: auto;
}

.demo-tab {
  padding: 1rem 1.5rem;
  background: none;
  border: none;
  color: var(--vp-c-text-2);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border-bottom: 2px solid transparent;
  white-space: nowrap;
}

.demo-tab:hover {
  color: var(--vp-c-text-1);
}

.demo-tab.active {
  color: var(--vp-c-text-1);
  border-bottom-color: var(--vp-c-brand-1);
}

.demo-showcase {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  overflow: hidden;
}

.demo-container {
  padding: 3rem;
  min-height: 300px;
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

.demo-preview {
  position: relative;
}

/* Demo Elements */
.demo-button {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 0.75rem 1.5rem;
  color: var(--vp-c-text-1);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.demo-button:hover {
  border-color: var(--vp-c-text-1);
}

.floating-element {
  z-index: 1000;
  animation: fadeInUp 0.2s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(8px) translateX(-50%);
  }

  to {
    opacity: 1;
    transform: translateY(0) translateX(-50%);
  }
}

/* Tooltip */
.tooltip {
  background: var(--vp-c-text-1);
  color: var(--vp-c-bg);
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  font-size: 0.875rem;
  white-space: nowrap;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.tooltip::before {
  content: "";
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 4px solid transparent;
  border-top-color: var(--vp-c-text-1);
}

/* Dropdown */
.dropdown {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  overflow: hidden;
  min-width: 160px;
}

.dropdown-item {
  padding: 0.75rem 1rem;
  color: var(--vp-c-text-1);
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.dropdown-item:hover {
  background: var(--vp-c-bg-soft);
}

/* Popover */
.popover {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  width: 280px;
}

.popover-header {
  padding: 1rem;
  border-bottom: 1px solid var(--vp-c-divider);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.popover-header h4 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: var(--vp-c-text-2);
  cursor: pointer;
  line-height: 1;
}

.close-btn:hover {
  color: var(--vp-c-text-1);
}

.popover-body {
  padding: 1rem;
  color: var(--vp-c-text-2);
  line-height: 1.5;
}

.arrow {
  font-size: 0.75rem;
  transition: transform 0.2s ease;
}

.demo-button:hover .arrow {
  transform: translateY(2px);
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
