<script setup lang="ts">
import { ref } from "vue"
import { useFloating, useDismiss, offset, flip, shift } from "v-float"

// --- 1. Refs for DOM elements ---
// These refs link our script to the button (anchor) and the popover (floating) elements in the template.
const anchorEl = ref(null)
const floatingEl = ref(null)

// --- 2. Floating Element Logic ---
// `useFloating` is the core composable. It calculates the position of the floating element.
const context = useFloating(anchorEl, floatingEl, {
  // We want the popover to be open or closed based on this `open` ref.
  // The `context` object returned will contain this ref.
  placement: "bottom-start", // Prefer placing it below the button, aligned to the start.

  // Middleware adjusts the final position. They run in order.
  middlewares: [
    offset(10), // 1. Move the popover 10px away from the button.
    flip(), // 2. If it runs out of space, flip it to the opposite side (e.g., 'top-start').
    shift({ padding: 10 }), // 3. If it's still partially out of view, shift it to stay visible.
  ],
})

// --- 3. Dismiss (Closing) Logic ---
// `useDismiss` adds behaviors that automatically close the popover.
// It modifies the `context.open` ref based on different events.
useDismiss(context, {
  // Allows closing the popover by pressing the 'Escape' key.
  escapeKey: true,

  // When a user scrolls any scrollable ancestor, the popover will close.
  // Try scrolling the page to see this in action.
  ancestorScroll: true,

  // By default, clicking the anchor/reference element again closes the popover.
  // We set this to `false` because our button's @click handler already toggles the state.
  anchorPress: false,

  // A powerful feature for complex cases. This function determines if a click
  // outside the popover should close it.
  outsidePress: (event) => {
    // We check if the clicked element (or any of its parents) has the class 'ignore-dismiss'.
    // If it does, we return `false` to *prevent* the popover from closing.
    if ((event.target as HTMLElement)?.closest(".ignore-dismiss")) {
      return false
    }
    // Otherwise, we return `true` to allow the dismiss behavior.
    return true
  },
})
</script>

<template>
  <div class="demo-container">
    <button ref="anchorEl" class="button-primary" @click="context.setOpen(!context.open.value)">
      {{ context.open.value ? "Hide" : "Show" }} Info
    </button>

    <!-- Use Vue's <Transition> for smooth animations -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="context.open.value"
          ref="floatingEl"
          :style="context.floatingStyles.value"
          class="popover"
          role="dialog"
          aria-labelledby="popover-title"
        >
          <div class="popover-header">
            <h3 id="popover-title" class="popover-title">Important Information</h3>
            <button @click="context.setOpen(false)" class="close-button" aria-label="Close popover">
              ×
            </button>
          </div>

          <div class="popover-body">
            <p>This popover has custom closing rules:</p>
            <ul>
              <li>✅ Press the <strong>Escape</strong> key.</li>
              <li>✅ <strong>Click outside</strong> of this popover.</li>
              <li>✅ <strong>Scroll</strong> the main page.</li>
              <li>❌ Clicking the button below will <strong>not</strong> close it.</li>
            </ul>

            <!-- This button has the 'ignore-dismiss' class, so our `outsidePress` handler will ignore it. -->
            <button class="ignore-dismiss">Clicking me won't close the popover</button>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Extra content to make the page scrollable -->
    <div class="scroll-content">
      <p>Scroll down to trigger the 'ancestorScroll' dismiss behavior.</p>
    </div>
  </div>
</template>

<style scoped>
/* Define CSS variables for easy theming */
:root {
  --brand-color: #42b883;
  --background-color: #ffffff;
  --text-color: #2c3e50;
  --border-color: #e2e8f0;
  --shadow-color: rgba(0, 0, 0, 0.1);
  --popover-width: 320px;
}

.demo-container {
  font-family: sans-serif;
  padding: 40px;
  color: var(--text-color);
  height: 400px;
  overflow-y: scroll;
}

.button-primary {
  background-color: var(--brand-color);
  color: black;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.button-primary:hover {
  background-color: #349a6d;
}

.popover {
  background: white;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: 0 4px 12px var(--shadow-color);
  width: var(--popover-width);
  z-index: 1000;
  overflow: hidden; /* Ensures child elements respect the border-radius */
}

.popover-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  background-color: #f8fafc;
}

.popover-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.popover-body {
  padding: 16px;
  font-size: 0.9rem;
  line-height: 1.6;
}

.popover-body ul {
  padding-left: 20px;
  margin: 12px 0;
}

.close-button {
  background: none;
  border: none;
  font-size: 24px;
  line-height: 1;
  padding: 0;
  cursor: pointer;
  color: black;
  transition: color 0.2s;
}

.close-button:hover {
  color: var(--text-color);
}

.ignore-dismiss {
  margin-top: 16px;
  padding: 8px 12px;
  width: 100%;
  background: #f1f5f9;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: black;
  font-weight: 500;
  cursor: pointer;
}
.ignore-dismiss:hover {
  background-color: #e2e8f0;
}

.scroll-content {
  height: 1000px;
  padding-top: 50px;
  border-top: 2px dashed var(--border-color);
  margin-top: 50px;
}

/* Vue Transition styles for the fade effect */
.fade-enter-active,
.fade-leave-active {
  transition:
    opacity 0.2s ease-in-out,
    transform 0.2s ease-in-out;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
