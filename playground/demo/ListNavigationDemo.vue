<script setup lang="ts">
import { ref } from 'vue'
import { useFloating, useClick, useEscapeKey } from '@/composables'
import { useListNavigation } from '@/composables/interactions/use-list-navigation'
import { offset, flip, shift, autoUpdate } from '@floating-ui/dom'

// --- 1. Basic Vertical List ---
const verticalOpen = ref(false)
const verticalAnchor = ref<HTMLElement | null>(null)
const verticalFloating = ref<HTMLElement | null>(null)
const verticalActiveIndex = ref<number | null>(null)
const verticalItems = ['Dashboard', 'Settings', 'Profile', 'Messages', 'Sign Out']
const verticalListRefs = ref<(HTMLElement | null)[]>([])

const vertical = useFloating(verticalAnchor, verticalFloating, {
  open: verticalOpen,
  onOpenChange: (v) => verticalOpen.value = v,
  placement: 'bottom-start',
  middleware: [offset(6), flip(), shift({ padding: 10 })],
  whileElementsMounted: autoUpdate
})

useListNavigation(vertical, {
  listRef: verticalListRefs,
  activeIndex: verticalActiveIndex,
  onNavigate: (i) => verticalActiveIndex.value = i,
  loop: true,
  orientation: 'vertical',
  focusItemOnHover: true,
  openOnArrowKeyDown: true
})

useClick(vertical)
useEscapeKey(vertical)

// --- 2. Grid Navigation (4x4) ---
const gridOpen = ref(false)
const gridAnchor = ref<HTMLElement | null>(null)
const gridFloating = ref<HTMLElement | null>(null)
const gridActiveIndex = ref<number | null>(null)
const gridItems = Array.from({ length: 16 }, (_, i) => `Item ${i + 1}`)
const gridListRefs = ref<(HTMLElement | null)[]>([])

const grid = useFloating(gridAnchor, gridFloating, {
  open: gridOpen,
  onOpenChange: (v) => gridOpen.value = v,
  placement: 'bottom-start',
  middleware: [offset(6), flip(), shift({ padding: 10 })],
  whileElementsMounted: autoUpdate
})

useListNavigation(grid, {
  listRef: gridListRefs,
  activeIndex: gridActiveIndex,
  onNavigate: (i) => gridActiveIndex.value = i,
  loop: true,
  orientation: 'both',
  cols: 4,
  focusItemOnHover: true,
  openOnArrowKeyDown: true
})

useClick(grid)
useEscapeKey(grid)

// --- 3. Virtual Navigation (aria-activedescendant) ---
const virtualOpen = ref(false)
const virtualAnchor = ref<HTMLElement | null>(null)
const virtualFloating = ref<HTMLElement | null>(null)
const virtualActiveIndex = ref<number | null>(null)
const virtualItems = ['Virtual 1', 'Virtual 2', 'Virtual 3', 'Virtual 4', 'Virtual 5']
const virtualListRefs = ref<(HTMLElement | null)[]>([])
const virtualItemRef = ref<HTMLElement | null>(null) // For aria-activedescendant

const virtual = useFloating(virtualAnchor, virtualFloating, {
  open: virtualOpen,
  onOpenChange: (v) => virtualOpen.value = v,
  placement: 'bottom-start',
  middleware: [offset(6), flip(), shift({ padding: 10 })],
  whileElementsMounted: autoUpdate
})

useListNavigation(virtual, {
  listRef: virtualListRefs,
  activeIndex: virtualActiveIndex,
  onNavigate: (i) => virtualActiveIndex.value = i,
  loop: true,
  virtual: true,
  virtualItemRef,
  focusItemOnHover: true,
  openOnArrowKeyDown: true
})

useClick(virtual)
useEscapeKey(virtual)

// --- 4. Disabled Items ---
const disabledOpen = ref(false)
const disabledAnchor = ref<HTMLElement | null>(null)
const disabledFloating = ref<HTMLElement | null>(null)
const disabledActiveIndex = ref<number | null>(null)
const disabledItemsList = ['Enabled 1', 'Disabled 2', 'Enabled 3', 'Disabled 4', 'Enabled 5']
const disabledListRefs = ref<(HTMLElement | null)[]>([])
const disabledIndices = [1, 3]

const disabled = useFloating(disabledAnchor, disabledFloating, {
  open: disabledOpen,
  onOpenChange: (v) => disabledOpen.value = v,
  placement: 'bottom-start',
  middleware: [offset(6), flip(), shift({ padding: 10 })],
  whileElementsMounted: autoUpdate
})

useListNavigation(disabled, {
  listRef: disabledListRefs,
  activeIndex: disabledActiveIndex,
  onNavigate: (i) => disabledActiveIndex.value = i,
  loop: true,
  disabledIndices,
  focusItemOnHover: true,
  openOnArrowKeyDown: true
})

useClick(disabled)
useEscapeKey(disabled)

</script>

<template>
  <div class="min-h-screen bg-gray-50 p-8 font-sans text-gray-900">
    <div class="max-w-4xl mx-auto space-y-8">
      <div class="text-center space-y-2">
        <h1 class="text-3xl font-bold text-gray-800">List Navigation Demo</h1>
        <p class="text-gray-500">Explore different navigation strategies with keyboard support.</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        <!-- Card 1: Vertical -->
        <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center gap-4">
          <h2 class="text-lg font-semibold text-gray-700">Vertical List</h2>
          <p class="text-sm text-gray-500 text-center">Standard dropdown with up/down navigation.</p>
          
          <button 
            ref="verticalAnchor"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors flex items-center gap-2"
          >
            Options <span class="text-xs opacity-70">▼</span>
          </button>

          <div 
            v-if="verticalOpen"
            ref="verticalFloating"
            :style="vertical.floatingStyles"
            class="bg-white border border-gray-200 rounded-lg shadow-xl py-1 min-w-[160px] z-50 flex flex-col focus:outline-none"
          >
            <div
              v-for="(item, index) in verticalItems"
              :key="item"
              :ref="el => verticalListRefs[index] = el as HTMLElement"
              class="px-4 py-2 text-sm cursor-pointer outline-none transition-colors"
              :class="[
                verticalActiveIndex === index ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
              ]"
              tabindex="-1"
              @click="verticalOpen = false; verticalActiveIndex = index"
            >
              {{ item }}
            </div>
          </div>
          
          <div class="h-6 text-sm text-blue-600 font-medium">
            {{ verticalActiveIndex !== null ? `Selected: ${verticalItems[verticalActiveIndex]}` : '' }}
          </div>
        </div>

        <!-- Card 2: Grid -->
        <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center gap-4">
          <h2 class="text-lg font-semibold text-gray-700">Grid Navigation</h2>
          <p class="text-sm text-gray-500 text-center">2D navigation with arrow keys (4x4).</p>
          
          <button 
            ref="gridAnchor"
            class="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-colors flex items-center gap-2"
          >
            Grid Menu <span class="text-xs opacity-70">▼</span>
          </button>

          <div 
            v-if="gridOpen"
            ref="gridFloating"
            :style="grid.floatingStyles"
            class="bg-white border border-gray-200 rounded-lg shadow-xl p-2 z-50 grid grid-cols-4 gap-1 focus:outline-none"
          >
            <div
              v-for="(item, index) in gridItems"
              :key="item"
              :ref="el => gridListRefs[index] = el as HTMLElement"
              class="w-10 h-10 flex items-center justify-center text-xs rounded cursor-pointer outline-none transition-all border"
              :class="[
                gridActiveIndex === index 
                  ? 'bg-emerald-100 border-emerald-500 text-emerald-700 font-bold' 
                  : 'bg-gray-50 border-gray-100 text-gray-600 hover:border-emerald-200'
              ]"
              tabindex="-1"
              @click="gridOpen = false; gridActiveIndex = index"
            >
              {{ index + 1 }}
            </div>
          </div>
           <div class="h-6 text-sm text-emerald-600 font-medium">
            {{ gridActiveIndex !== null ? `Selected: ${gridItems[gridActiveIndex]}` : '' }}
          </div>
        </div>

        <!-- Card 3: Virtual Focus -->
        <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center gap-4">
          <h2 class="text-lg font-semibold text-gray-700">Virtual Focus</h2>
          <p class="text-sm text-gray-500 text-center">Uses aria-activedescendant (focus stays on input).</p>
          
          <input 
            ref="virtualAnchor"
            placeholder="Type to search..."
            class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none w-full max-w-[200px]"
            @click="virtualOpen = true"
          />

          <div 
            v-if="virtualOpen"
            ref="virtualFloating"
            :style="virtual.floatingStyles"
            class="bg-white border border-gray-200 rounded-lg shadow-xl py-1 min-w-[200px] z-50 flex flex-col"
            role="listbox"
            :aria-activedescendant="virtualActiveIndex !== null ? `virtual-item-${virtualActiveIndex}` : undefined"
          >
            <div
              v-for="(item, index) in virtualItems"
              :key="item"
              :id="`virtual-item-${index}`"
              :ref="el => { if(el) virtualListRefs[index] = el as HTMLElement }"
              class="px-4 py-2 text-sm cursor-pointer transition-colors"
              :class="[
                virtualActiveIndex === index ? 'bg-purple-50 text-purple-700' : 'text-gray-700 hover:bg-gray-50'
              ]"
              role="option"
              :aria-selected="virtualActiveIndex === index"
              @click="virtualOpen = false; virtualActiveIndex = index"
            >
              {{ item }}
            </div>
          </div>
          <div class="h-6 text-sm text-purple-600 font-medium">
            {{ virtualActiveIndex !== null ? `Active: ${virtualItems[virtualActiveIndex]}` : '' }}
          </div>
        </div>

        <!-- Card 4: Disabled Items -->
        <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center gap-4">
          <h2 class="text-lg font-semibold text-gray-700">Disabled Items</h2>
          <p class="text-sm text-gray-500 text-center">Skips disabled items during navigation.</p>
          
          <button 
            ref="disabledAnchor"
            class="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 focus:ring-2 focus:ring-orange-500 focus:outline-none transition-colors flex items-center gap-2"
          >
            Mixed List <span class="text-xs opacity-70">▼</span>
          </button>

          <div 
            v-if="disabledOpen"
            ref="disabledFloating"
            :style="disabled.floatingStyles"
            class="bg-white border border-gray-200 rounded-lg shadow-xl py-1 min-w-[160px] z-50 flex flex-col focus:outline-none"
          >
            <div
              v-for="(item, index) in disabledItemsList"
              :key="item"
              :ref="el => disabledListRefs[index] = el as HTMLElement"
              class="px-4 py-2 text-sm outline-none transition-colors"
              :class="[
                disabledIndices.includes(index) 
                  ? 'opacity-40 cursor-not-allowed text-gray-400' 
                  : (disabledActiveIndex === index ? 'bg-orange-50 text-orange-700 cursor-pointer' : 'text-gray-700 hover:bg-gray-50 cursor-pointer')
              ]"
              tabindex="-1"
              @click="!disabledIndices.includes(index) && (disabledOpen = false, disabledActiveIndex = index)"
            >
              {{ item }}
            </div>
          </div>
          <div class="h-6 text-sm text-orange-600 font-medium">
            {{ disabledActiveIndex !== null ? `Selected: ${disabledItemsList[disabledActiveIndex]}` : '' }}
          </div>
        </div>

      </div>
    </div>
  </div>
</template>
