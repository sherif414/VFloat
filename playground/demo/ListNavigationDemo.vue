<script setup lang="ts">
import { ref, nextTick, type Ref } from 'vue'
import { useFloating } from '@/composables'
import { useListNavigation } from '@/composables/interactions/use-list-navigation'
import { useClick, useEscapeKey } from '@/composables'
import { offset, flip, shift } from '@floating-ui/dom'

// Helper function to focus first item
const focusFirstItem = async (listRefs: Ref<Array<HTMLElement | null>>, activeIndex: Ref<number | null>) => {
  await nextTick()
  if (listRefs.value[0]) {
    listRefs.value[0].focus()
    activeIndex.value = 0
  }
}

// Basic dropdown example
const isOpen = ref(false)
const anchorEl = ref<HTMLElement | null>(null)
const floatingEl = ref<HTMLElement | null>(null)
const activeIndex = ref<number | null>(null)

const items = ref([
  'Apple',
  'Banana', 
  'Cherry',
  'Date',
  'Elderberry',
  'Fig',
  'Grape',
  'Honeydew'
])

const listRefs = ref<Array<HTMLElement | null>>([])

const floating = useFloating(anchorEl, floatingEl, {
  placement: 'bottom-start',
  open: isOpen,
  onOpenChange: async (open) => {
    isOpen.value = open
    if (open) {
      await focusFirstItem(listRefs, activeIndex)
    }
  },
  middlewares: [offset(5), flip(), shift({ padding: 5 })]
})

useListNavigation(floating, {
  listRef: listRefs,
  activeIndex,
  onNavigate: (index) => activeIndex.value = index,
  loop: true,
  orientation: 'vertical',
  focusItemOnHover: true,
  openOnArrowKeyDown: true
})

useClick(floating)

useEscapeKey(floating)

// Grid example
const isGridOpen = ref(false)
const gridAnchorEl = ref<HTMLElement | null>(null)
const gridFloatingEl = ref<HTMLElement | null>(null)
const gridActiveIndex = ref<number | null>(null)

const gridItems = ref([
  'A1', 'A2', 'A3', 'A4',
  'B1', 'B2', 'B3', 'B4', 
  'C1', 'C2', 'C3', 'C4',
  'D1', 'D2', 'D3', 'D4'
])

const gridListRefs = ref<Array<HTMLElement | null>>([])

const gridFloating = useFloating(gridAnchorEl, gridFloatingEl, {
  placement: 'bottom-start',
  open: isGridOpen,
  onOpenChange: async (open) => {
    isGridOpen.value = open
    if (open) {
      await focusFirstItem(gridListRefs, gridActiveIndex)
    }
  },
  middlewares: [offset(5), flip(), shift({ padding: 5 })]
})

useListNavigation(gridFloating, {
  listRef: gridListRefs,
  activeIndex: gridActiveIndex,
  onNavigate: (index) => gridActiveIndex.value = index,
  loop: true,
  orientation: 'both',
  cols: 4,
  focusItemOnHover: true,
  openOnArrowKeyDown: true
})

useClick(gridFloating)

useEscapeKey(gridFloating)

// Virtual navigation example
const isVirtualOpen = ref(false)
const virtualAnchorEl = ref<HTMLElement | null>(null)
const virtualFloatingEl = ref<HTMLElement | null>(null)
const virtualActiveIndex = ref<number | null>(null)
const virtualItemRef = ref<HTMLElement | null>(null)

const virtualItems = ref([
  'Virtual Item 1',
  'Virtual Item 2',
  'Virtual Item 3',
  'Virtual Item 4',
  'Virtual Item 5'
])

const virtualListRefs = ref<Array<HTMLElement | null>>([])

const virtualFloating = useFloating(virtualAnchorEl, virtualFloatingEl, {
  placement: 'bottom-start',
  open: isVirtualOpen,
  onOpenChange: async (open) => {
    isVirtualOpen.value = open
    if (open) {
      await nextTick()
      virtualActiveIndex.value = 0 // Just set active index for virtual mode
    }
  },
  middlewares: [offset(5), flip(), shift({ padding: 5 })]
})

useListNavigation(virtualFloating, {
  listRef: virtualListRefs,
  activeIndex: virtualActiveIndex,
  onNavigate: (index) => virtualActiveIndex.value = index,
  loop: true,
  orientation: 'vertical',
  virtual: true,
  virtualItemRef,
  focusItemOnHover: false,
  openOnArrowKeyDown: true
})

useClick(virtualFloating)

useEscapeKey(virtualFloating)

// Disabled items example
const isDisabledOpen = ref(false)
const disabledAnchorEl = ref<HTMLElement | null>(null)
const disabledFloatingEl = ref<HTMLElement | null>(null)
const disabledActiveIndex = ref<number | null>(null)

const disabledItems = ref([
  'Enabled Item 1',
  'Disabled Item 2',
  'Enabled Item 3',
  'Disabled Item 4',
  'Enabled Item 5',
  'Disabled Item 6'
])

const disabledListRefs = ref<Array<HTMLElement | null>>([])

const disabledFloating = useFloating(disabledAnchorEl, disabledFloatingEl, {
  placement: 'bottom-start',
  open: isDisabledOpen,
  onOpenChange: async (open) => {
    isDisabledOpen.value = open
    if (open) {
      await nextTick()
      // Find first enabled item (not indices 1, 3, 5)
      const firstEnabledIndex = disabledListRefs.value.findIndex((_, i) => ![1, 3, 5].includes(i))
      if (firstEnabledIndex >= 0 && disabledListRefs.value[firstEnabledIndex]) {
        disabledListRefs.value[firstEnabledIndex].focus()
        disabledActiveIndex.value = firstEnabledIndex
      }
    }
  },
  middlewares: [offset(5), flip(), shift({ padding: 5 })]
})

useListNavigation(disabledFloating, {
  listRef: disabledListRefs,
  activeIndex: disabledActiveIndex,
  onNavigate: (index) => disabledActiveIndex.value = index,
  loop: true,
  orientation: 'vertical',
  disabledIndices: [1, 3, 5],
  focusItemOnHover: true,
  openOnArrowKeyDown: true
})

useClick(disabledFloating)

useEscapeKey(disabledFloating)
</script>

<template>
  <div class="list-navigation-demo">
    <h1>useListNavigation Demo</h1>
    
    <!-- Basic Vertical List -->
    <div class="demo-section">
      <h2>Basic Vertical List</h2>
      <p>Arrow keys navigate, Enter to select, hover to focus</p>
      
      <button 
        ref="anchorEl"
        @click="isOpen = !isOpen"
        class="trigger-button"
      >
        Select Fruit ▾
      </button>
      
      <div
        ref="floatingEl"
        :style="floating.floatingStyles"
        v-show="isOpen"
        class="dropdown-menu"
        role="listbox"
        aria-label="Fruits"
      >
        <div
          v-for="(item, index) in items"
          :key="item"
          :ref="(el) => listRefs[index] = el as HTMLElement"
          class="menu-item"
          :class="{ active: activeIndex === index }"
          role="option"
          tabindex="-1"
          :aria-selected="activeIndex === index"
          @click="() => { activeIndex = index; isOpen = false }"
        >
          {{ item }}
        </div>
      </div>
      
      <div v-if="activeIndex !== null" class="selection">
        Selected: {{ items[activeIndex] }}
      </div>
    </div>

    <!-- Grid Navigation -->
    <div class="demo-section">
      <h2>Grid Navigation (4x4)</h2>
      <p>Arrow keys navigate in 2D grid</p>
      
      <button 
        ref="gridAnchorEl"
        @click="isGridOpen = !isGridOpen"
        class="trigger-button"
      >
        Open Grid ▾
      </button>
      
      <div
        ref="gridFloatingEl"
        :style="gridFloating.floatingStyles"
        v-show="isGridOpen"
        class="grid-menu"
        role="grid"
        aria-label="Grid navigation"
      >
        <div class="grid-row" v-for="row in 4" :key="row">
          <div
            v-for="col in 4"
            :key="`${row}-${col}`"
            :ref="(el) => gridListRefs[(row-1) * 4 + (col-1)] = el as HTMLElement"
            class="grid-item"
            :class="{ active: gridActiveIndex === (row-1) * 4 + (col-1) }"
            role="gridcell"
            tabindex="-1"
            @click="() => { gridActiveIndex = (row-1) * 4 + (col-1); isGridOpen = false }"
          >
            {{ gridItems[(row-1) * 4 + (col-1)] }}
          </div>
        </div>
      </div>
      
      <div v-if="gridActiveIndex !== null" class="selection">
        Selected: {{ gridItems[gridActiveIndex] }}
      </div>
    </div>

    <!-- Virtual Navigation -->
    <div class="demo-section">
      <h2>Virtual Navigation</h2>
      <p>Uses aria-activedescendant instead of focus management</p>
      
      <button 
        ref="virtualAnchorEl"
        @click="isVirtualOpen = !isVirtualOpen"
        class="trigger-button"
      >
        Virtual List ▾
      </button>
      
      <div
        ref="virtualFloatingEl"
        :style="virtualFloating.floatingStyles"
        v-show="isVirtualOpen"
        class="dropdown-menu"
        role="listbox"
        aria-label="Virtual items"
      >
        <div
          v-for="(item, index) in virtualItems"
          :key="item"
          :ref="(el) => { if (el) virtualListRefs[index] = el as HTMLElement }"
          :id="`virtual-item-${index}`"
          class="menu-item"
          :class="{ active: virtualActiveIndex === index }"
          role="option"
          tabindex="-1"
          :aria-selected="virtualActiveIndex === index"
          @click="() => { virtualActiveIndex = index; isVirtualOpen = false }"
        >
          {{ item }}
        </div>
      </div>
      
      <div v-if="virtualActiveIndex !== null" class="selection">
        Selected: {{ virtualItems[virtualActiveIndex] }}
      </div>
    </div>

    <!-- Disabled Items -->
    <div class="demo-section">
      <h2>Disabled Items</h2>
      <p>Navigation skips disabled items</p>
      
      <button 
        ref="disabledAnchorEl"
        @click="isDisabledOpen = !isDisabledOpen"
        class="trigger-button"
      >
        Mixed List ▾
      </button>
      
      <div
        ref="disabledFloatingEl"
        :style="disabledFloating.floatingStyles"
        v-show="isDisabledOpen"
        class="dropdown-menu"
        role="listbox"
        aria-label="Mixed enabled/disabled items"
      >
        <div
          v-for="(item, index) in disabledItems"
          :key="item"
          :ref="(el) => disabledListRefs[index] = el as HTMLElement"
          class="menu-item"
          :class="{ 
            active: disabledActiveIndex === index,
            disabled: [1, 3, 5].includes(index)
          }"
          :aria-disabled="[1, 3, 5].includes(index)"
          role="option"
          tabindex="-1"
          :aria-selected="disabledActiveIndex === index"
          @click="() => { 
            if (![1, 3, 5].includes(index)) {
              disabledActiveIndex = index; 
              isDisabledOpen = false 
            }
          }"
        >
          {{ item }}
        </div>
      </div>
      
      <div v-if="disabledActiveIndex !== null" class="selection">
        Selected: {{ disabledItems[disabledActiveIndex] }}
      </div>
    </div>

    <!-- Instructions -->
    <div class="instructions">
      <h2>Keyboard Controls</h2>
      <ul>
        <li><strong>Arrow Keys:</strong> Navigate through items</li>
        <li><strong>Home/End:</strong> Jump to first/last item</li>
        <li><strong>Enter/Space:</strong> Select focused item</li>
        <li><strong>Escape:</strong> Close dropdown</li>
      </ul>
      <h2>Dismissal Methods</h2>
      <ul>
        <li><strong>Click Item:</strong> Select and close dropdown</li>
        <li><strong>Click Outside:</strong> Close dropdown</li>
        <li><strong>Click Trigger:</strong> Toggle dropdown</li>
        <li><strong>Escape Key:</strong> Close dropdown</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.list-navigation-demo {
  display: flex;
  flex-direction: column;
  gap: 32px;
  padding: 24px;
  max-width: 800px;
  margin: 0 auto;
}

h1 {
  margin: 0;
  font-size: 24px;
  color: #111827;
}

h2 {
  margin: 0 0 8px 0;
  font-size: 18px;
  color: #111827;
}

.demo-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.demo-section p {
  margin: 0;
  color: #6b7280;
  font-size: 14px;
}

.trigger-button {
  padding: 8px 16px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: #f9fafb;
  cursor: pointer;
  font-size: 14px;
  align-self: flex-start;
}

.trigger-button:hover {
  background: #f3f4f6;
}

.dropdown-menu {
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  padding: 4px;
  min-width: 200px;
  z-index: 1000;
}

.menu-item {
  padding: 8px 12px;
  cursor: pointer;
  border-radius: 4px;
  font-size: 14px;
}

.menu-item:hover,
.menu-item.active {
  background: #eff6ff;
  color: #1d4ed8;
}

.menu-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  color: #9ca3af;
}

.menu-item.disabled:hover {
  background: transparent;
  color: #9ca3af;
}

.grid-menu {
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  padding: 8px;
  z-index: 1000;
}

.grid-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
}

.grid-item {
  padding: 12px;
  cursor: pointer;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  font-size: 14px;
  text-align: center;
  min-width: 60px;
}

.grid-item:hover,
.grid-item.active {
  background: #eff6ff;
  color: #1d4ed8;
  border-color: #3b82f6;
}

.selection {
  padding: 8px 12px;
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 4px;
  font-size: 14px;
  color: #0369a1;
  align-self: flex-start;
}

.instructions {
  padding: 16px;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.instructions h2 {
  margin-bottom: 12px;
}

.instructions ul {
  margin: 0;
  padding-left: 20px;
}

.instructions li {
  margin-bottom: 4px;
  font-size: 14px;
  color: #4b5563;
}
</style>
