<template>
  <div class="demo-preview">
    <div class="popover-demo">
      <button ref="popoverTrigger" class="demo-button">Open popover</button>
      <Teleport to="body">
        <div
          v-show="popoverNode.data.isPositioned.value"
          ref="popoverFloating"
          class="popover floating-element"
          :style="popoverNode.data.floatingStyles.value"
        >
          <div class="popover-header">
            <h4>Positioning Options</h4>
            <button @click="popoverNode.data.setOpen(false)" class="close-btn">×</button>
          </div>
          <ul class="menu">
            <li
              ref="fileTrigger"
              class="menu-item"
              :class="{ open: fileNode.data.open.value }"
              tabindex="-1"
              @keydown.right.prevent="fileNode.data.setOpen(true)"
            >
              File <span class="submenu-arrow">▶︎</span>
              <Teleport to="body">
                <ul
                  v-show="fileNode.data.isPositioned.value"
                  ref="fileFloating"
                  class="submenu floating-element"
                  :style="fileNode.data.floatingStyles.value"
                >
                  <li ref="newFileItem" class="menu-item" @click="handleActionClick" tabindex="-1">
                    New
                  </li>
                  <li ref="openFileItem" class="menu-item" @click="handleActionClick" tabindex="-1">
                    Open
                  </li>
                  <li
                    ref="exportTrigger"
                    class="menu-item"
                    :class="{ open: exportNode.data.open.value }"
                    tabindex="-1"
                    @keydown.right.prevent="exportNode.data.setOpen(true)"
                  >
                    Export <span class="submenu-arrow">▶︎</span>
                    <Teleport to="body">
                      <ul
                        v-show="exportNode.data.isPositioned.value"
                        ref="exportFloating"
                        class="sub-submenu floating-element"
                        :style="exportNode.data.floatingStyles.value"
                      >
                        <li ref="pdfItem" class="menu-item" @click="handleActionClick" tabindex="-1">
                          PDF
                        </li>
                        <li ref="docxItem" class="menu-item" @click="handleActionClick" tabindex="-1">
                          DOCX
                        </li>
                      </ul>
                    </Teleport>
                  </li>
                </ul>
              </Teleport>
            </li>
            <li
              ref="editItem"
              class="menu-item"
              @click="handleActionClick"
              tabindex="-1"
            >
              Edit
            </li>
            <li
              ref="viewTrigger"
              class="menu-item"
              :class="{ open: viewNode.data.open.value }"
              tabindex="-1"
              @keydown.right.prevent="viewNode.data.setOpen(true)"
            >
              View <span class="submenu-arrow">▶︎</span>
              <Teleport to="body">
                <ul
                  v-show="viewNode.data.isPositioned.value"
                  ref="viewFloating"
                  class="submenu floating-element"
                  :style="viewNode.data.floatingStyles.value"
                >
                  <li ref="zoomInItem" class="menu-item" @click="handleActionClick" tabindex="-1">
                    Zoom In
                  </li>
                  <li ref="zoomOutItem" class="menu-item" @click="handleActionClick" tabindex="-1">
                    Zoom Out
                  </li>
                </ul>
              </Teleport>
            </li>
            <li
              ref="helpItem"
              class="menu-item"
              @click="handleActionClick"
              tabindex="-1"
            >
              Help
            </li>
          </ul>
        </div>
      </Teleport>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTemplateRef, ref, computed } from "vue"
import { useFloatingTree, useClick, useHover, offset, shift, useEscapeKey, useListNavigation, useFocusTrap } from "v-float"

const popoverTrigger = useTemplateRef("popoverTrigger")
const popoverFloating = useTemplateRef("popoverFloating")

// Create floating hierarchy tree
const tree = useFloatingTree({ deleteStrategy: "recursive" })
const popoverNode = tree.addNode(popoverTrigger, popoverFloating, {
  placement: "bottom-start",
  open: ref(false),
  middlewares: [offset(4)],
})!

useClick(popoverNode, { outsideClick: true })
useEscapeKey(popoverNode)

// File submenu
const fileTrigger = useTemplateRef("fileTrigger")
const fileFloating = useTemplateRef("fileFloating")
const fileNode = tree.addNode(fileTrigger, fileFloating, {
  placement: "right-start",
  open: ref(false),
  middlewares: [offset(2), shift({ padding: 8 })],
  parentId: popoverNode.id,
})!
useHover(fileNode, { delay: 50, safePolygon: true })

// Export sub-submenu
const exportTrigger = useTemplateRef("exportTrigger")
const exportFloating = useTemplateRef("exportFloating")
const exportNode = tree.addNode(exportTrigger, exportFloating, {
  placement: "right-start",
  open: ref(false),
  middlewares: [offset(2), shift({ padding: 8 })],
  parentId: fileNode.id,
})!
useHover(exportNode, { delay: 50, safePolygon: true })

// View submenu
const viewTrigger = useTemplateRef("viewTrigger")
const viewFloating = useTemplateRef("viewFloating")
const viewNode = tree.addNode(viewTrigger, viewFloating, {
  placement: "right-start",
  open: ref(false),
  middlewares: [offset(2), shift({ padding: 8 })],
  parentId: popoverNode.id,
})!
useHover(viewNode, { delay: 50, safePolygon: true })

// Navigation & Focus Trap Setup
const popoverActiveIndex = ref<number | null>(null)
const fileActiveIndex = ref<number | null>(null)
const exportActiveIndex = ref<number | null>(null)
const viewActiveIndex = ref<number | null>(null)

const editItem = useTemplateRef("editItem")
const helpItem = useTemplateRef("helpItem")
const newFileItem = useTemplateRef("newFileItem")
const openFileItem = useTemplateRef("openFileItem")
const pdfItem = useTemplateRef("pdfItem")
const docxItem = useTemplateRef("docxItem")
const zoomInItem = useTemplateRef("zoomInItem")
const zoomOutItem = useTemplateRef("zoomOutItem")

const popoverItems = computed(() => [
  fileTrigger.value,
  editItem.value,
  viewTrigger.value,
  helpItem.value,
])

const fileItems = computed(() => [
  newFileItem.value,
  openFileItem.value,
  exportTrigger.value,
])

const exportItems = computed(() => [pdfItem.value, docxItem.value])

const viewItems = computed(() => [zoomInItem.value, zoomOutItem.value])

useListNavigation(popoverNode, {
  listRef: popoverItems,
  activeIndex: popoverActiveIndex,
  onNavigate: (i) => (popoverActiveIndex.value = i),
  loop: true,
})
useFocusTrap(popoverNode)

useListNavigation(fileNode, {
  listRef: fileItems,
  activeIndex: fileActiveIndex,
  onNavigate: (i) => (fileActiveIndex.value = i),
  loop: true,
  nested: true,
  selectedIndex: 0,
})
useFocusTrap(fileNode)

useListNavigation(exportNode, {
  listRef: exportItems,
  activeIndex: exportActiveIndex,
  onNavigate: (i) => (exportActiveIndex.value = i),
  loop: true,
  nested: true,
  selectedIndex: 0,
})
useFocusTrap(exportNode)

useListNavigation(viewNode, {
  listRef: viewItems,
  activeIndex: viewActiveIndex,
  onNavigate: (i) => (viewActiveIndex.value = i),
  loop: true,
  nested: true,
  selectedIndex: 0,
})
useFocusTrap(viewNode)

// Handle action clicks to close popover
const handleActionClick = () => {
  tree.getAllOpenNodes().forEach((node) => {
    node.data.setOpen(false)
  })
}
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
.menu-item.open,
.menu-item:focus {
  background: var(--vp-c-bg-soft);
  outline: none;
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
