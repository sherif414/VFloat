<template>
  <div class="context-menu-example">
    <div class="demo-area" @contextmenu.prevent="showContextMenu">
      <h3>Context Menu Demo</h3>
      <p>Right-click anywhere in this area to see the static positioning in action.</p>
      
      <div class="grid">
        <div class="item">Item 1</div>
        <div class="item">Item 2</div>
        <div class="item">Item 3</div>
        <div class="item">Item 4</div>
      </div>
      
      <p class="instruction">
        The menu will appear at your right-click position and stay there (not follow cursor).
      </p>
    </div>

    <!-- Context Menu -->
    <Teleport to="body">
      <div
        v-if="contextMenuContext.open.value"
        ref="contextFloating"
        :style="contextMenuContext.floatingStyles.value"
        class="context-menu"
      >
        <button @click="executeAction('copy')" class="menu-item">
          📋 Copy
        </button>
        <button @click="executeAction('paste')" class="menu-item">
          📄 Paste  
        </button>
        <div class="divider"></div>
        <button @click="executeAction('delete')" class="menu-item danger">
          🗑️ Delete
        </button>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue"
import { useFloating, useClientPoint, useClick } from "@/composables"
import { flip, shift } from "@floating-ui/dom"

// Context menu state
const contextReference = ref(null)
const contextFloating = ref(null)

// Floating context for context menu
const contextMenuContext = useFloating(contextReference, contextFloating, {
  placement: "bottom-start",
  middlewares: [flip(), shift({ padding: 8 })],
})

// Static positioning - menu appears at click position and stays there
useClientPoint(contextReference, contextMenuContext, {
  trackingMode: "static"
})

// Handle outside clicks to close menu
useClick(contextMenuContext, {
  outsideClick: true
})

function showContextMenu(event: MouseEvent) {
  // Set reference to the clicked element for positioning
  contextReference.value = event.target as HTMLElement
  contextMenuContext.setOpen(true)
}

function executeAction(action: string) {
  console.log(`Context menu action: ${action}`)
  contextMenuContext.setOpen(false)
}
</script>

<style scoped>
.context-menu-example {
  padding: 2rem;
}

.demo-area {
  background: #f8f9fa;
  border: 2px dashed #dee2e6;
  border-radius: 12px;
  padding: 2rem;
  min-height: 400px;
  cursor: context-menu;
  transition: all 0.2s ease;
}

.demo-area:hover {
  border-color: #007bff;
  background: #e9ecef;
}

.demo-area h3 {
  margin: 0 0 1rem 0;
  color: #343a40;
  text-align: center;
}

.demo-area p {
  margin: 0 0 1.5rem 0;
  color: #6c757d;
  text-align: center;
}

.instruction {
  font-style: italic;
  font-size: 0.875rem;
  color: #fd7e14 !important;
}

.grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  max-width: 300px;
  margin: 0 auto 1.5rem auto;
}

.item {
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 1rem;
  text-align: center;
  color: #343a40;
  transition: all 0.2s ease;
}

.item:hover {
  border-color: #007bff;
  background: #f8f9ff;
}

.context-menu {
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  padding: 0.5rem 0;
  min-width: 140px;
  z-index: 1000;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: none;
  background: none;
  color: #343a40;
  font-size: 0.875rem;
  cursor: pointer;
  transition: background-color 0.2s ease;
  text-align: left;
}

.menu-item:hover {
  background: #f8f9fa;
}

.menu-item.danger:hover {
  background: #fff5f5;
  color: #dc3545;
}

.divider {
  height: 1px;
  background: #dee2e6;
  margin: 0.25rem 0;
}
</style>