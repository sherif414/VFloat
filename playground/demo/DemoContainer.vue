<script lang="ts" setup>
import { ref, computed, onMounted, watch, nextTick, reactive } from "vue"

// --- PROPS ---
// Kept the original props for passing code data
const props = defineProps<{
  code: string
}>()

// --- STATE ---
const tabs = ["Preview", "Code"]
const selectedTab = ref("Preview")
const copied = ref(false)

// State for the animated underline, adopted from the new component
const underlineStyle = reactive({
  left: "0px",
  width: "0px",
})

// Use an array ref to hold the button elements
const tabButtons = ref<HTMLButtonElement[]>([])

// --- COMPUTED ---
// Use a computed property for derived state, it's more efficient
const sourceCode = computed(() => decodeURIComponent(props.code))

// --- METHODS ---
const copyToClipboard = async (value: string) => {
  await navigator.clipboard.writeText(value)
  copied.value = true
  // Reset the "Copied!" feedback after 2 seconds
  setTimeout(() => {
    copied.value = false
  }, 2000)
}

// Logic to update the underline position, adopted from the new component
const updateUnderline = () => {
  // nextTick ensures the DOM has been updated before we measure elements
  nextTick(() => {
    const selectedButton = tabButtons.value.find(
      (button) => button.textContent?.trim() === selectedTab.value
    )
    if (selectedButton) {
      underlineStyle.left = `${selectedButton.offsetLeft}px`
      underlineStyle.width = `${selectedButton.offsetWidth}px`
    }
  })
}

// --- LIFECYCLE HOOKS ---
onMounted(updateUnderline)
watch(selectedTab, updateUnderline)
</script>

<template>
  <div class="demo-container">
    <!-- Tab Header (from new component, adapted) -->
    <div class="tabs-header">
      <div class="tab-buttons-wrapper">
        <button
          v-for="tab in tabs"
          :key="tab"
          :ref="
            (el) => {
              if (el) tabButtons.push(el as HTMLButtonElement)
            }
          "
          @click="selectedTab = tab"
          :class="['tab-button', { active: selectedTab === tab }]"
        >
          {{ tab }}
        </button>
      </div>
      <div class="underline-bar" :style="underlineStyle"></div>
    </div>

    <!-- Preview Tab (from old component) -->
    <div class="demo-preview" v-show="selectedTab === 'Preview'">
      <slot></slot>
    </div>

    <!-- Code Tab (from old component) -->
    <div class="demo-code" v-show="selectedTab === 'Code'">
      <!-- Using a wrapper for positioning the copy button -->
      <div class="code-wrapper">
        <button title="Copy code" class="copy-btn" @click="copyToClipboard(sourceCode)">
          {{ copied ? "Copied!" : "Copy" }}
        </button>
        <pre class="language-vue"><code class="language-vue">{{ sourceCode }}</code></pre>
      </div>
    </div>
  </div>
</template>

<style>
/* Using a global style block like the original to allow --vp variables to work properly. */

/* ==================================
 *          Container Styles
 * (From original component)
 * ================================== */
.demo-container {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  margin: 16px 0;
  overflow: hidden;
}

/* ==================================
 *             Tab Styles
 * (From new component, adapted with variables)
 * ================================== */
.tabs-header {
  position: relative;
  border-bottom: 1px solid var(--vp-c-divider);
  padding: 0 16px;
}

.tab-buttons-wrapper {
  display: flex;
}

.tab-button {
  /* Reset button styles */
  background: none;
  border: none;
  cursor: pointer;
  font-family: inherit;

  /* Styling */
  position: relative;
  z-index: 10;
  font-size: 14px;
  font-weight: 500;
  color: var(--vp-c-text-2);
  padding: 10px 16px;
  transition: color 0.3s ease-in-out;
}

.tab-button:hover {
  color: var(--vp-c-text-1);
}

.tab-button.active {
  color: var(--vp-c-brand-1);
}

.underline-bar {
  position: absolute;
  bottom: -1px; /* Sits on top of the border */
  height: 2px;
  background-color: var(--vp-c-brand-1);
  transition: all 300ms ease-in-out;
}

/* ==================================
 *           Preview Styles
 * (From original component)
 * ================================== */
.demo-preview {
  background: var(--vp-c-bg-alt);
  min-height: 150px;
  padding: 24px;
}

/* ==================================
 *            Code Styles
 * (From original component, slightly adapted)
 * ================================== */
.demo-code {
  background-color: var(--vp-code-bg);
}

.code-wrapper {
  position: relative;
}

.copy-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 2;

  /* Reset button styles */
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  cursor: pointer;

  /* Styling */
  background-color: var(--vp-c-bg-soft);
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 500;
  color: var(--vp-c-text-2);
  transition: all 0.2s ease;
}

.copy-btn:hover {
  background-color: var(--vp-c-bg-mute);
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.demo-code .language-vue {
  margin: 0;
  border-radius: 0;
  padding: 20px 24px;
  font-size: 13px;
  line-height: 1.6;
  overflow-x: auto;
  color: var(--vp-c-text-1);
  background-color: transparent !important; /* Override theme defaults if necessary */
}

.demo-code pre {
  margin: 0;
  background: transparent !important;
}

/* ==================================
 *          Responsive Styles
 * ================================== */
@media (max-width: 768px) {
  .demo-preview {
    padding: 16px;
  }
  .demo-code .language-vue {
    padding: 16px;
  }
  .tabs-header {
    padding: 0 8px;
  }
  .tab-button {
    padding: 8px 12px;
  }
}
</style>
