<script lang="ts" setup>
import { ref, computed, onMounted, watch, nextTick, reactive } from "vue"

// --- PROPS ---
const props = defineProps<{
  typescript?: string
  // if using ts, javascript will transform the to js
  javascript?: string
  title?: string
  metadata?: object
}>()

// --- STATE ---
const tabs = ["Preview", "Code"]
const selectedTab = ref("Preview")
const tabButtons = ref<HTMLButtonElement[]>([])
const copied = ref(false)
const sourceCode = computed(() => decodeURIComponent(props.typescript || props.javascript || ""))

const underlineStyle = reactive({
  left: "0px",
  width: "0px",
})

let timeoutId: ReturnType<typeof setTimeout> | null = null

// --- METHODS ---
async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    copied.value = true
    timeoutId != null && clearTimeout(timeoutId)
    timeoutId = setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch {
    const element = document.createElement("textarea")
    const previouslyFocusedElement = document.activeElement

    element.value = text

    // Prevent keyboard from showing on mobile
    element.setAttribute("readonly", "")

    element.style.contain = "strict"
    element.style.position = "absolute"
    element.style.left = "-9999px"
    element.style.fontSize = "12pt" // Prevent zooming on iOS

    const selection = document.getSelection()
    const originalRange = selection ? selection.rangeCount > 0 && selection.getRangeAt(0) : null

    document.body.appendChild(element)
    element.select()

    // Explicit selection workaround for iOS
    element.selectionStart = 0
    element.selectionEnd = text.length

    document.execCommand("copy")
    document.body.removeChild(element)

    if (originalRange) {
      selection!.removeAllRanges() // originalRange can't be truthy when selection is falsy
      selection!.addRange(originalRange)
    }

    // Get the focus back on the previously focused element, if any
    if (previouslyFocusedElement) {
      ;(previouslyFocusedElement as HTMLElement).focus()
    }
  }
}

const updateUnderline = () => {
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
  <div class="v-float-demo-container">
    <!-- Tab Header -->
    <div class="v-float-demo-tabs-header">
      <div class="v-float-demo-tab-buttons-wrapper">
        <button
          v-for="tab in tabs"
          :key="tab"
          :ref="
            (el) => {
              if (el) tabButtons.push(el as HTMLButtonElement)
            }
          "
          @click="selectedTab = tab"
          :class="['v-float-demo-tab-button', { active: selectedTab === tab }]"
        >
          {{ tab }}
        </button>
      </div>
      <div class="v-float-demo-underline-bar" :style="underlineStyle"></div>
    </div>

    <div class="v-float-demo-preview" v-if="selectedTab === 'Preview'">
      <slot />
    </div>

    <div class="v-float-demo-code" v-else>
      <!-- Using a wrapper for positioning the copy button -->
      <div class="v-float-demo-code-wrapper">
        <button
          title="Copy code"
          class="v-float-demo-copy-btn"
          :disabled="copied"
          @click="copyToClipboard(sourceCode)"
        >
          {{ copied ? "Copied!" : "Copy" }}
        </button>
        <slot name="md:typescript" />
        <slot name="md:javascript" />
      </div>
    </div>
  </div>
</template>

<style>
/* Using a global style block like the original to allow --vp variables to work properly. */

/* ==================================
 *          Container Styles
 * ================================== */
.v-float-demo-container {
  margin: 16px 0;
  overflow: hidden;
}

/* ==================================
 *             Tab Styles
 * ================================== */
.v-float-demo-tabs-header {
  position: relative;
  border-bottom: 1px solid var(--vp-c-divider);
  padding: 0 16px;
  margin-bottom: 1rem;
}

.v-float-demo-tab-buttons-wrapper {
  display: flex;
}

.v-float-demo-tab-button {
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

.v-float-demo-tab-button:hover {
  color: var(--vp-c-text-1);
}

.v-float-demo-tab-button.active {
  color: var(--vp-c-brand-1);
}

.v-float-demo-underline-bar {
  position: absolute;
  bottom: -1px; /* Sits on top of the border */
  height: 2px;
  background-color: var(--vp-c-brand-1);
  transition: all 300ms ease-in-out;
}

/* ==================================
 *           Preview Styles
 * ================================== */
.v-float-demo-preview {
  min-height: 150px;
  padding: 24px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

/* ==================================
 *            Code Styles
 * ================================== */
.v-float-demo-code {
  /* background-color: var(--vp-code-bg); */
}

.v-float-demo-code-wrapper {
  position: relative;
}

.v-float-demo-copy-btn {
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

.v-float-demo-copy-btn:hover {
  background-color: var(--vp-c-bg-mute);
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.v-float-demo-code .language-vue {
  margin: 0;
  border-radius: 0;
  padding: 20px 24px;
  font-size: 13px;
  line-height: 1.6;
  overflow-x: auto;
  color: var(--vp-c-text-1);
  background-color: transparent !important; /* Override theme defaults if necessary */
}

.v-float-demo-code pre {
  margin: 0;
  background: transparent !important;
}

/* ==================================
 *          Responsive Styles
 * ================================== */
@media (max-width: 768px) {
  .v-float-demo-preview {
    padding: 16px;
  }
  .v-float-demo-code .language-vue {
    padding: 16px;
  }
  .v-float-demo-tabs-header {
    padding: 0 8px;
  }
  .v-float-demo-tab-button {
    padding: 8px 12px;
  }
}
</style>
