<template>
  <div class="demo-preview">
    <div class="context-demo">
      <div ref="contextArea" class="context-area" @contextmenu.prevent="showContextMenu($event)">
        <div class="context-content">
          <h3>Right-click anywhere in this area</h3>
          <p>
            The context menu will appear at your cursor position using <code>useClientPoint</code>
          </p>
        </div>
      </div>

      <Teleport to="body">
        <div
          v-if="context.open.value"
          ref="contextFloating"
          :style="context.floatingStyles.value"
          class="context-menu floating-element"
        >
          <div class="menu-item" @click="hideContextMenu">
            <svg class="menu-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              ></path>
            </svg>
            Copy
          </div>
          <div class="menu-item" @click="hideContextMenu">
            <svg class="menu-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              ></path>
            </svg>
            Paste
          </div>
          <div class="menu-divider"></div>
          <div class="menu-item" @click="hideContextMenu">
            <svg class="menu-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              ></path>
            </svg>
            Delete
          </div>
        </div>
      </Teleport>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, useTemplateRef } from "vue"
import { useFloating, useClientPoint, flip, shift, useClick } from "v-float"

const contextAreaEl = useTemplateRef("contextArea")
const anchorEl = ref(null)
const floatingEl = useTemplateRef("contextFloating")

const context = useFloating(anchorEl, floatingEl, {
  placement: "bottom-start",
  middlewares: [flip(), shift({ padding: 8 })],
})

useClientPoint(contextAreaEl, context, { trackingMode: "static" })
useClick(context, {
  outsideClick: true,
  toggle: false, // Don't toggle on inside clicks
  ignoreMouse: true,
})

function showContextMenu(event) {
  context.setOpen(true)
}

function hideContextMenu() {
  context.setOpen(false)
}
</script>

<style scoped>
.demo-preview {
  position: relative;
}

.context-area {
  background: var(--vp-c-bg-soft);
  border: 2px dashed var(--vp-c-divider);
  border-radius: 12px;
  padding: 2rem;
  min-height: 300px;
  cursor: context-menu;
  transition: all 0.2s ease;
}

.context-area:hover {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-bg-elv);
}

.context-content {
  text-align: center;
}

.context-content h3 {
  margin: 0 0 0.5rem 0;
  color: var(--vp-c-text-1);
  font-size: 1.125rem;
}

.context-content p {
  margin: 0 0 1.5rem 0;
  color: var(--vp-c-text-2);
  font-size: 0.875rem;
}

.context-content code {
  background: var(--vp-c-bg);
  padding: 0.125rem 0.25rem;
  border-radius: 4px;
  font-size: 0.8rem;
  color: var(--vp-c-brand-1);
}

.floating-element {
  z-index: 1000;
}

.context-menu {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 0.5rem 0;
  min-width: 140px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  backdrop-filter: blur(8px);
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  color: var(--vp-c-text-1);
  font-size: 0.875rem;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.menu-item:hover {
  background: var(--vp-c-bg-soft);
}

.menu-icon {
  width: 16px;
  height: 16px;
  color: var(--vp-c-text-2);
}

.menu-divider {
  height: 1px;
  background: var(--vp-c-divider);
  margin: 0.25rem 0;
}

@media (max-width: 768px) {
  .context-area {
    padding: 1rem;
    min-height: 200px;
  }
}
</style>
