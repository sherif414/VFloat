<template>
  <div class="demo-preview">
    <div class="popover-demo">
      <button ref="popoverTrigger" class="demo-button">Open popover</button>
      <Teleport to="body">
        <div
          v-show="popoverContext.isPositioned.value"
          ref="popoverFloating"
          class="popover floating-element"
          :style="popoverContext.floatingStyles.value"
        >
          <div class="popover-header">
            <h4>Positioning Options</h4>
            <button @click="popoverContext.setOpen(false)" class="close-btn">
              ×
            </button>
          </div>
          <ul class="menu">
            <li
              ref="fileTrigger"
              class="menu-item"
              :class="{ open: fileContext.open.value }"
            >
              File <span class="submenu-arrow">▶︎</span>
              <Teleport to="body">
                <ul
                  v-show="fileContext.isPositioned.value"
                  ref="fileFloating"
                  class="submenu floating-element"
                  :style="fileContext.floatingStyles.value"
                >
                  <li class="menu-item">New</li>
                  <li class="menu-item">Open</li>
                  <li
                    ref="exportTrigger"
                    class="menu-item"
                    :class="{ open: exportContext.open.value }"
                  >
                    Export <span class="submenu-arrow">▶︎</span>
                    <Teleport to="body">
                      <ul
                        v-show="exportContext.isPositioned.value"
                        ref="exportFloating"
                        class="sub-submenu floating-element"
                        :style="exportContext.floatingStyles.value"
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
            <li
              ref="viewTrigger"
              class="menu-item"
              :class="{ open: viewContext.open.value }"
            >
              View <span class="submenu-arrow">▶︎</span>
              <Teleport to="body">
                <ul
                  v-show="viewContext.isPositioned.value"
                  ref="viewFloating"
                  class="submenu floating-element"
                  :style="viewContext.floatingStyles.value"
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
import { useTemplateRef, ref } from "vue";
import {
  useFloatingTree,
  useFloating,
  useClick,
  useDismiss,
  useHover,
  offset,
  shift,
} from "v-float";

const popoverTrigger = useTemplateRef("popoverTrigger");
const popoverFloating = useTemplateRef("popoverFloating");

const popoverContext = useFloating(popoverTrigger, popoverFloating, {
  placement: "bottom-start",
  open: ref(false),
  middlewares: [offset(4)],
});

useClick(popoverContext);
useDismiss(popoverContext);

// Create floating hierarchy tree
const tree = useFloatingTree(popoverContext, { deleteStrategy: "recursive" });

// File submenu
const fileTrigger = useTemplateRef("fileTrigger");
const fileFloating = useTemplateRef("fileFloating");
const fileContext = useFloating(fileTrigger, fileFloating, {
  placement: "right-start",
  open: ref(false),
  middlewares: [offset(2), shift({ padding: 8 })],
});
useHover(fileContext, { delay: 200 });
useDismiss(fileContext);
const fileNode = tree.addNode(fileContext, tree.root.id);

// Export sub-submenu
const exportTrigger = useTemplateRef("exportTrigger");
const exportFloating = useTemplateRef("exportFloating");
const exportContext = useFloating(exportTrigger, exportFloating, {
  placement: "right-start",
  open: ref(false),
  middlewares: [offset(2), shift({ padding: 8 })],
});
useHover(exportContext, { delay: 200 });
useDismiss(exportContext);
const exportNode = tree.addNode(exportContext, fileNode.id);

// View submenu
const viewTrigger = useTemplateRef("viewTrigger");
const viewFloating = useTemplateRef("viewFloating");
const viewContext = useFloating(viewTrigger, viewFloating, {
  placement: "right-start",
  open: ref(false),
  middlewares: [offset(2), shift({ padding: 8 })],
});
useHover(viewContext, { delay: 200 });
useDismiss(viewContext);
const viewNode = tree.addNode(viewContext, tree.root.id);
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
