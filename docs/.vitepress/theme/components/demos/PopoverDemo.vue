<template>
  <div class="demo-preview">
    <div class="popover-demo">
      <button ref="popoverTrigger" class="demo-button">Open popover</button>
      <Teleport to="body">
        <div
          v-show="tree.root.data.isPositioned.value"
          ref="popoverFloating"
          class="popover floating-element"
          :style="tree.root.data.floatingStyles.value"
        >
          <div class="popover-header">
            <h4>Positioning Options</h4>
            <button @click="tree.root.data.setOpen(false)" class="close-btn">×</button>
          </div>
          <ul class="menu">
            <li ref="fileTrigger" class="menu-item" :class="{ open: fileNode.data.open.value }">
              File <span class="submenu-arrow">▶︎</span>
              <Teleport to="body">
                <ul
                  v-show="fileNode.data.isPositioned.value"
                  ref="fileFloating"
                  class="submenu floating-element"
                  :style="fileNode.data.floatingStyles.value"
                >
                  <li class="menu-item">New</li>
                  <li class="menu-item">Open</li>
                  <li
                    ref="exportTrigger"
                    class="menu-item"
                    :class="{ open: exportNode.data.open.value }"
                  >
                    Export <span class="submenu-arrow">▶︎</span>
                    <Teleport to="body">
                      <ul
                        v-show="exportNode.data.isPositioned.value"
                        ref="exportFloating"
                        class="sub-submenu floating-element"
                        :style="exportNode.data.floatingStyles.value"
                      >
                        <li class="menu-item">PDF</li>
                        <li class="menu-item">DOCX</li>
                      </ul>
                    </Teleport>
                  </li>
                </ul>
              </Teleport>
            </li>
            <li ref="editItem" class="menu-item">Edit</li>
            <li ref="viewTrigger" class="menu-item" :class="{ open: viewNode.data.open.value }">
              View <span class="submenu-arrow">▶︎</span>
              <Teleport to="body">
                <ul
                  v-show="viewNode.data.isPositioned.value"
                  ref="viewFloating"
                  class="submenu floating-element"
                  :style="viewNode.data.floatingStyles.value"
                >
                  <li class="menu-item">Zoom In</li>
                  <li class="menu-item">Zoom Out</li>
                </ul>
              </Teleport>
            </li>
            <li ref="helpItem" class="menu-item">Help</li>
          </ul>
        </div>
      </Teleport>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTemplateRef, ref } from "vue"
import { useFloatingTree, useClick, useHover, offset, shift, useEscapeKey } from "v-float"

const popoverTrigger = useTemplateRef("popoverTrigger")
const popoverFloating = useTemplateRef("popoverFloating")

// Create floating hierarchy tree
const tree = useFloatingTree(
  popoverTrigger,
  popoverFloating,
  {
    placement: "bottom-start",
    open: ref(false),
    middlewares: [offset(4)],
  },
  { deleteStrategy: "recursive" }
)

useClick(tree.root, { outsideClick: true })
useEscapeKey(tree.root)

// File submenu
const fileTrigger = useTemplateRef("fileTrigger")
const fileFloating = useTemplateRef("fileFloating")
const fileNode = tree.addNode(fileTrigger, fileFloating, {
  placement: "right-start",
  open: ref(false),
  middlewares: [offset(2), shift({ padding: 8 })],
  parentId: tree.root.id,
})!
useHover(fileNode, { delay: 200, safePolygon: true })

// Export sub-submenu
const exportTrigger = useTemplateRef("exportTrigger")
const exportFloating = useTemplateRef("exportFloating")
const exportNode = tree.addNode(exportTrigger, exportFloating, {
  placement: "right-start",
  open: ref(false),
  middlewares: [offset(2), shift({ padding: 8 })],
  parentId: fileNode.id,
})!
useHover(exportNode, { delay: 200, safePolygon: true })

// View submenu
const viewTrigger = useTemplateRef("viewTrigger")
const viewFloating = useTemplateRef("viewFloating")
const viewNode = tree.addNode(viewTrigger, viewFloating, {
  placement: "right-start",
  open: ref(false),
  middlewares: [offset(2), shift({ padding: 8 })],
  parentId: tree.root.id,
})!
useHover(viewNode, { delay: 200, safePolygon: true })
</script>

<style scoped>
.demo-preview {
  position: relative;
}

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
}

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
.menu {
  list-style: none;
  margin: 0;
  padding: 0;
}
.menu-item {
  padding: 0.5rem 1rem;
  cursor: pointer;
  white-space: nowrap;
}
.menu-item:hover,
.menu-item.open {
  background: var(--vp-c-bg-soft);
}
.submenu,
.sub-submenu {
  list-style: none;
  margin: 0;
  padding: 0.25rem 0;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  min-width: 160px;
}
.submenu-arrow {
  float: right;
  margin-left: 0.5rem;
  transition: transform 0.2s ease-in-out;
}

.menu-item.open > .submenu-arrow {
  transform: rotate(90deg);
}
</style>
