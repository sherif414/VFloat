<script setup lang="ts">
import { ref, computed } from 'vue'
import { useClick, useFloating, useFocusTrap } from '../../src'
import { offset, flip, shift } from '../../src'

const open = ref(false)
const reference = ref(null)
const floating = ref(null)

const context = useFloating(reference, floating, {
  open,
  onOpenChange: (v) => open.value = v,
  placement: 'bottom',
  middlewares: [offset(10), flip(), shift()]
})

const { floatingStyles } = context

// Options for the demo
const isModal = ref(true)
const returnFocus = ref(true)
const initialFocus = ref('first') // 'first', 'close-btn'

const initialFocusTarget = computed(() => {
  if (initialFocus.value === 'close-btn') {
    return () => document.getElementById('close-btn')
  }
  return initialFocus.value
})

useFocusTrap(context, {
  enabled: open,
  modal: isModal,
  returnFocus,
  initialFocus: ()=> initialFocusTarget.value ?? false
})

useClick(context, {
  outsideClick: true
})

</script>

<template>
  <div class="p-8 flex flex-col items-center gap-8 min-h-screen bg-gray-50">
    <h1 class="text-2xl font-bold">Focus Trap Demo</h1>

    <div class="flex flex-wrap gap-4 p-4 bg-white rounded shadow max-w-2xl justify-center">
      <label class="flex items-center gap-2 cursor-pointer select-none">
        <input type="checkbox" v-model="isModal" class="rounded text-blue-600 focus:ring-blue-500"> Modal
      </label>
      <label class="flex items-center gap-2 cursor-pointer select-none">
        <input type="checkbox" v-model="returnFocus" class="rounded text-blue-600 focus:ring-blue-500"> Return Focus
      </label>
      <div class="flex items-center gap-2">
        <span class="text-sm font-medium">Initial Focus:</span>
        <select v-model="initialFocus" class="border rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
          <option value="first">First Element</option>
          <option value="close-btn">Close Button</option>
        </select>
      </div>
    </div>

    <button
      ref="reference"
      @click="open = !open"
      class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
    >
      {{ open ? 'Close Modal' : 'Open Modal' }}
    </button>

    <div v-if="open" ref="floating" :style="floatingStyles" class="bg-white p-6 rounded-lg shadow-xl border border-gray-200 w-80 flex flex-col gap-4 z-50">
      <div class="flex justify-between items-start">
        <h2 class="text-xl font-semibold">Modal Title</h2>
        <button @click="open = false" class="text-gray-400 hover:text-gray-600 rounded p-1 hover:bg-gray-100" aria-label="Close">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>
      
      <p class="text-gray-600 text-sm">Tab through these elements. Focus should be trapped within this container.</p>
      
      <div class="space-y-3">
        <div>
          <label class="block text-xs font-medium text-gray-700 mb-1">First Input</label>
          <input type="text" placeholder="Type something..." class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none transition-shadow" />
        </div>
        
        <div class="flex gap-2">
          <button class="flex-1 px-3 py-2 bg-gray-100 rounded hover:bg-gray-200 focus:ring-2 focus:ring-gray-400 transition-colors">Action A</button>
          <button class="flex-1 px-3 py-2 bg-gray-100 rounded hover:bg-gray-200 focus:ring-2 focus:ring-gray-400 transition-colors">Action B</button>
        </div>

        <div>
          <label class="block text-xs font-medium text-gray-700 mb-1">Last Input</label>
          <input type="text" placeholder="Another input..." class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none transition-shadow" />
        </div>
      </div>

      <div class="pt-2 border-t mt-2">
        <button
          id="close-btn"
          @click="open = false"
          class="w-full px-4 py-2 bg-red-50 text-red-700 rounded hover:bg-red-100 focus:ring-2 focus:ring-red-500 transition-colors font-medium"
        >
          Close Modal
        </button>
      </div>
    </div>
    
    <div class="mt-8 p-6 bg-white rounded shadow max-w-md w-full">
      <h3 class="font-semibold mb-4">External Content</h3>
      <p class="text-sm text-gray-600 mb-4">Use this input to test focus trapping. When the modal is open, you shouldn't be able to tab to this input if 'Modal' is checked.</p>
      <input type="text" placeholder="External Input" class="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" />
    </div>
  </div>
</template>
