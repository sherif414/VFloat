<script setup lang="ts">
import { ref, computed } from 'vue'
import { useFloating, useFocusTrap } from '../../src'
import { offset, flip, shift } from '../../src'

const open = ref(false)
const reference = ref<HTMLElement | null>(null)
const floating = ref<HTMLElement | null>(null)

const context = useFloating(reference, floating, {
  open,
  onOpenChange: (v) => open.value = v,
  placement: 'bottom',
  middlewares: [offset(10), flip(), shift()]
})

const { floatingStyles } = context

// All configurable options
const enabled = ref(true)
const isModal = ref(true)
const useGuards = ref(true)
const orderConfig = ref<Array<'content' | 'reference' | 'floating'>>(['content'])
const initialFocus = ref<string>('first') // 'first', 'last', 'close-btn', 'input-1', 'input-2', 'number-0'
const returnFocus = ref(true)
const restoreFocus = ref(false)
const closeOnFocusOut = ref(false)
const preventScroll = ref(true)
const outsideElementsInert = ref(false)

// Dynamic items for testing focus restoration
const dynamicItems = ref([
  { id: 1, name: 'Item 1' },
  { id: 2, name: 'Item 2' },
  { id: 3, name: 'Item 3' }
])

// Computed initialFocus target based on selection
const initialFocusTarget = computed<number | HTMLElement | (() => HTMLElement | null) | 'first' | 'last'>(() => {
  switch (initialFocus.value) {
    case 'first':
      return 'first'
    case 'last':
      return 'last'
    case 'close-btn':
      return () => document.getElementById('close-btn')
    case 'input-1':
      return () => document.getElementById('input-1')
    case 'input-2':
      return () => document.getElementById('input-2')
    case 'number-0':
      return 0
    default:
      return 'first'
  }
})

// Focus trap setup
useFocusTrap(context, {
  enabled,
  modal: isModal,
  guards: useGuards,
  order: orderConfig,
  initialFocus: initialFocusTarget,
  returnFocus,
  restoreFocus,
  closeOnFocusOut,
  preventScroll,
  outsideElementsInert
})

// Helper functions for testing
function removeDynamicItem(id: number) {
  dynamicItems.value = dynamicItems.value.filter(item => item.id !== id)
}

function addDynamicItem() {
  const newId = Math.max(...dynamicItems.value.map(i => i.id), 0) + 1
  dynamicItems.value.push({ id: newId, name: `Item ${newId}` })
}

// Order configuration helpers
const orderOptions = [
  { value: ['content'], label: 'Content only' },
  { value: ['reference', 'content'], label: 'Reference → Content' },
  { value: ['content', 'reference'], label: 'Content → Reference' },
  { value: ['floating', 'content'], label: 'Floating → Content' },
  { value: ['reference', 'floating', 'content'], label: 'Reference → Floating → Content' }
]

function getOrderLabel() {
  const option = orderOptions.find(opt => 
    JSON.stringify(opt.value) === JSON.stringify(orderConfig.value)
  )
  return option?.label || 'Custom'
}
</script>

<template>
  <div class="p-8 flex flex-col items-center gap-8 min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
    <div class="max-w-6xl w-full">
      <h1 class="text-3xl font-bold text-center mb-2 text-slate-800">useFocusTrap Playground</h1>
      <p class="text-center text-slate-600 mb-8">Comprehensive testing for all focus trap features</p>

      <!-- Configuration Panel -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <!-- Core Options -->
        <div class="bg-white p-6 rounded-lg shadow-md border border-slate-200">
          <h3 class="font-semibold text-lg mb-4 text-slate-700 border-b pb-2">Core Options</h3>
          <div class="space-y-3">
            <label class="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" v-model="enabled" class="rounded text-blue-600 focus:ring-blue-500">
              <span class="text-sm">Enabled</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" v-model="isModal" class="rounded text-blue-600 focus:ring-blue-500">
              <span class="text-sm">Modal</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" v-model="useGuards" class="rounded text-blue-600 focus:ring-blue-500">
              <span class="text-sm">Guards</span>
            </label>
          </div>
        </div>

        <!-- Focus Behavior -->
        <div class="bg-white p-6 rounded-lg shadow-md border border-slate-200">
          <h3 class="font-semibold text-lg mb-4 text-slate-700 border-b pb-2">Focus Behavior</h3>
          <div class="space-y-3">
            <label class="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" v-model="returnFocus" class="rounded text-blue-600 focus:ring-blue-500">
              <span class="text-sm">Return Focus</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" v-model="restoreFocus" class="rounded text-blue-600 focus:ring-blue-500">
              <span class="text-sm">Restore Focus</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" v-model="preventScroll" class="rounded text-blue-600 focus:ring-blue-500">
              <span class="text-sm">Prevent Scroll</span>
            </label>
          </div>
        </div>

        <!-- Advanced Options -->
        <div class="bg-white p-6 rounded-lg shadow-md border border-slate-200">
          <h3 class="font-semibold text-lg mb-4 text-slate-700 border-b pb-2">Advanced</h3>
          <div class="space-y-3">
            <label class="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" v-model="closeOnFocusOut" class="rounded text-blue-600 focus:ring-blue-500">
              <span class="text-sm">Close on Focus Out</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" v-model="outsideElementsInert" class="rounded text-blue-600 focus:ring-blue-500">
              <span class="text-sm">Outside Inert</span>
            </label>
          </div>
          <div class="mt-3 text-xs text-slate-500">
            <span class="font-medium">Note:</span> Close on Focus Out only works when Modal is unchecked
          </div>
        </div>

        <!-- Initial Focus -->
        <div class="bg-white p-6 rounded-lg shadow-md border border-slate-200">
          <h3 class="font-semibold text-lg mb-4 text-slate-700 border-b pb-2">Initial Focus</h3>
          <div class="space-y-2">
            <label class="flex items-center gap-2 cursor-pointer select-none">
              <input type="radio" v-model="initialFocus" value="first" name="initial" class="text-blue-600 focus:ring-blue-500">
              <span class="text-sm">First Element</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer select-none">
              <input type="radio" v-model="initialFocus" value="last" name="initial" class="text-blue-600 focus:ring-blue-500">
              <span class="text-sm">Last Element</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer select-none">
              <input type="radio" v-model="initialFocus" value="close-btn" name="initial" class="text-blue-600 focus:ring-blue-500">
              <span class="text-sm">Close Button (Function)</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer select-none">
              <input type="radio" v-model="initialFocus" value="input-1" name="initial" class="text-blue-600 focus:ring-blue-500">
              <span class="text-sm">First Input (Function)</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer select-none">
              <input type="radio" v-model="initialFocus" value="number-0" name="initial" class="text-blue-600 focus:ring-blue-500">
              <span class="text-sm">Index 0 (Number)</span>
            </label>
          </div>
        </div>

        <!-- Tab Order -->
        <div class="bg-white p-6 rounded-lg shadow-md border border-slate-200">
          <h3 class="font-semibold text-lg mb-4 text-slate-700 border-b pb-2">Tab Order</h3>
          <div class="space-y-2">
            <label v-for="option in orderOptions" :key="option.label" class="flex items-center gap-2 cursor-pointer select-none">
              <input 
                type="radio" 
                :value="option.value"
                v-model="orderConfig"
                name="order"
                class="text-blue-600 focus:ring-blue-500"
              >
              <span class="text-sm">{{ option.label }}</span>
            </label>
          </div>
          <div class="mt-3 text-xs text-slate-500">
            <span class="font-medium">Current:</span> {{ getOrderLabel() }}
          </div>
        </div>

        <!-- Status -->
        <div class="bg-white p-6 rounded-lg shadow-md border border-slate-200">
          <h3 class="font-semibold text-lg mb-4 text-slate-700 border-b pb-2">Status</h3>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-slate-600">Trap State:</span>
              <span :class="open && enabled ? 'text-green-600 font-medium' : 'text-slate-400'">
                {{ open && enabled ? 'Active' : 'Inactive' }}
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-600">Mode:</span>
              <span class="font-medium text-slate-800">{{ isModal ? 'Modal' : 'Non-Modal' }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-600">Dynamic Items:</span>
              <span class="font-medium text-slate-800">{{ dynamicItems.length }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Trigger Button -->
      <div class="flex justify-center mb-8">
        <button
          ref="reference"
          @click="open = !open"
          class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-500/50 focus:ring-offset-2 transition-all font-medium text-lg shadow-lg"
        >
          {{ open ? 'Close Floating Element' : 'Open Floating Element' }}
        </button>
      </div>

      <!-- Floating Content -->
      <div 
        v-if="open" 
        ref="floating" 
        :style="floatingStyles" 
        class="bg-white p-6 rounded-lg shadow-2xl border border-slate-200 w-96 flex flex-col gap-4 z-50"
      >
        <div class="flex justify-between items-start">
          <h2 class="text-xl font-semibold text-slate-800">Focus Trap Content</h2>
          <button 
            @click="open = false" 
            class="text-slate-400 hover:text-slate-600 rounded p-1 hover:bg-slate-100 transition-colors" 
            aria-label="Close"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        
        <p class="text-slate-600 text-sm">
          Tab through these elements. The behavior changes based on your configuration.
        </p>
        
        <div class="space-y-3">
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">First Input</label>
            <input 
              id="input-1"
              type="text" 
              placeholder="Try tabbing through..." 
              class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none transition-shadow" 
            />
          </div>
          
          <div class="flex gap-2">
            <button class="flex-1 px-3 py-2 bg-slate-100 rounded hover:bg-slate-200 focus:ring-2 focus:ring-slate-400 transition-colors">
              Button A
            </button>
            <button class="flex-1 px-3 py-2 bg-slate-100 rounded hover:bg-slate-200 focus:ring-2 focus:ring-slate-400 transition-colors">
              Button B
            </button>
          </div>

          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">Second Input</label>
            <input 
              id="input-2"
              type="text" 
              placeholder="Another input..." 
              class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none transition-shadow" 
            />
          </div>

          <!-- Dynamic Items Section for testing restoreFocus -->
          <div class="border-t pt-3">
            <div class="flex justify-between items-center mb-2">
              <label class="block text-xs font-medium text-slate-700">Dynamic Items (Focus Restore Test)</label>
              <button 
                @click="addDynamicItem"
                class="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 focus:ring-2 focus:ring-green-500 transition-colors"
              >
                + Add
              </button>
            </div>
            <div class="space-y-1">
              <div 
                v-for="item in dynamicItems" 
                :key="item.id"
                class="flex gap-2 items-center"
              >
                <input 
                  :id="`dynamic-item-${item.id}`"
                  type="text" 
                  :placeholder="item.name" 
                  class="flex-1 px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500 outline-none" 
                />
                <button 
                  @click="removeDynamicItem(item.id)"
                  class="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 focus:ring-2 focus:ring-red-500 transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
            <p class="text-xs text-slate-500 mt-2">
              Enable "Restore Focus" and focus a dynamic item, then remove it to test restoration
            </p>
          </div>
        </div>

        <div class="pt-2 border-t mt-2">
          <!-- <button
            id="close-btn"
            @click="open = false"
            class="w-full px-4 py-2 bg-red-50 text-red-700 rounded hover:bg-red-100 focus:ring-2 focus:ring-red-500 transition-colors font-medium"
          >
            Close
          </button> -->
        </div>
      </div>
    </div>

    <!-- External Test Area -->
    <div class="max-w-6xl w-full grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
      <div class="bg-white p-6 rounded-lg shadow-md border border-slate-200">
        <h3 class="font-semibold mb-4 text-slate-700">External Content (Before)</h3>
        <p class="text-sm text-slate-600 mb-4">
          This input is outside the trap. Test modal behavior by trying to tab here when the floating element is open.
        </p>
        <input 
          type="text" 
          placeholder="External Input Before" 
          class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" 
        />
      </div>

      <div class="bg-white p-6 rounded-lg shadow-md border border-slate-200">
        <h3 class="font-semibold mb-4 text-slate-700">External Content (After)</h3>
        <p class="text-sm text-slate-600 mb-4">
          Another external input. Also test "Close on Focus Out" by clicking here when modal is disabled.
        </p>
        <input 
          type="text" 
          placeholder="External Input After" 
          class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" 
        />
      </div>
    </div>

    <!-- Instructions -->
    <div class="max-w-6xl w-full bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg shadow-md border border-blue-200 mt-8">
      <h3 class="font-semibold text-lg mb-4 text-slate-800">Testing Guide</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-700">
        <div>
          <h4 class="font-medium mb-2 text-blue-700">Basic Tests</h4>
          <ul class="space-y-1 list-disc list-inside">
            <li>Toggle <strong>Modal</strong> and try tabbing to external inputs</li>
            <li>Toggle <strong>Guards</strong> to see tab wrapping behavior</li>
            <li>Change <strong>Initial Focus</strong> and reopen the trap</li>
            <li>Toggle <strong>Return Focus</strong> and close the trap</li>
          </ul>
        </div>
        <div>
          <h4 class="font-medium mb-2 text-blue-700">Advanced Tests</h4>
          <ul class="space-y-1 list-disc list-inside">
            <li>Enable <strong>Restore Focus</strong>, focus a dynamic item, then remove it</li>
            <li>Disable Modal, enable <strong>Close on Focus Out</strong>, click outside</li>
            <li>Try different <strong>Tab Order</strong> configurations</li>
            <li>Toggle <strong>Outside Inert</strong> in modal mode (check browser DevTools)</li>
          </ul>
        </div>
        <div>
          <h4 class="font-medium mb-2 text-blue-700">Edge Cases</h4>
          <ul class="space-y-1 list-disc list-inside">
            <li>Disable <strong>Enabled</strong> while trap is open</li>
            <li>Remove all dynamic items and test focus behavior</li>
            <li>Test Shift+Tab for reverse navigation</li>
            <li>Toggle <strong>Prevent Scroll</strong> if you have scroll overflow</li>
          </ul>
        </div>
        <div>
          <h4 class="font-medium mb-2 text-blue-700">Keyboard Shortcuts</h4>
          <ul class="space-y-1 list-disc list-inside">
            <li><kbd class="px-1 py-0.5 bg-white border rounded">Tab</kbd> - Navigate forward</li>
            <li><kbd class="px-1 py-0.5 bg-white border rounded">Shift+Tab</kbd> - Navigate backward</li>
            <li><kbd class="px-1 py-0.5 bg-white border rounded">Esc</kbd> - Close (if configured)</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
kbd {
  font-family: monospace;
  font-size: 0.875rem;
}
</style>
