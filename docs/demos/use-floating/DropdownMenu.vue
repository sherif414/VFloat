<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue"
import { useFloating, offset, flip, shift } from "v-float"

const anchorEl = ref<HTMLElement | null>(null)
const floatingEl = ref<HTMLElement | null>(null)
const isOpen = ref(false)

const { floatingStyles, update } = useFloating(anchorEl, floatingEl, {
  placement: "bottom-start",
  open: isOpen,
  middlewares: [offset(4), flip(), shift({ padding: 8 })],
})

const toggleDropdown = () => {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    update()
  }
}

const closeDropdown = () => {
  isOpen.value = false
}

const handleClickOutside = (event: MouseEvent) => {
  if (
    !anchorEl.value?.contains(event.target as Node) &&
    !floatingEl.value?.contains(event.target as Node)
  ) {
    closeDropdown()
  }
}

const handleEscape = (event: KeyboardEvent) => {
  if (event.key === "Escape") {
    closeDropdown()
  }
}

onMounted(() => {
  document.addEventListener("click", handleClickOutside)
  document.addEventListener("keydown", handleEscape)
})

onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside)
  document.removeEventListener("keydown", handleEscape)
})

const menuItems = [
  { label: "Profile", action: () => console.log("Profile clicked") },
  { label: "Settings", action: () => console.log("Settings clicked") },
  { label: "Help", action: () => console.log("Help clicked") },
  { label: "Sign out", action: () => console.log("Sign out clicked") },
]

const handleItemClick = (item: (typeof menuItems)[0]) => {
  item.action()
  closeDropdown()
}
</script>

<template>
  <div class="dropdown-container">
    <button
      ref="anchorEl"
      @click="toggleDropdown"
      :aria-expanded="isOpen"
      aria-haspopup="true"
      class="dropdown-trigger"
    >
      Menu
      <svg
        class="dropdown-icon"
        :class="{ 'rotate-180': isOpen }"
        width="16"
        height="16"
        viewBox="0 0 16 16"
      >
        <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="2" fill="none" />
      </svg>
    </button>

    <div v-if="isOpen" ref="floatingEl" :style="floatingStyles" class="dropdown-menu" role="menu">
      <button
        v-for="item in menuItems"
        :key="item.label"
        @click="handleItemClick(item)"
        class="dropdown-item"
        role="menuitem"
      >
        {{ item.label }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.dropdown-container {
  display: inline-block;
  position: relative;
}

.dropdown-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
  color: #1f2937;
}

.dropdown-trigger:hover {
  background: #f9fafb;
}

.dropdown-trigger:focus {
  outline: 2px solid #93c5fd;
  outline-offset: 2px;
}

.dropdown-icon {
  transition: transform 0.2s;
  margin-left: 4px;
}

.rotate-180 {
  transform: rotate(180deg);
}

.dropdown-menu {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);
  padding: 4px;
  min-width: 180px;
  z-index: 50;
  position: absolute;
  margin-top: 4px;
}

.dropdown-item {
  display: block;
  width: 100%;
  padding: 8px 12px;
  text-align: left;
  background: none;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
  font-size: 14px;
  color: #1f2937;
}

.dropdown-item:hover {
  background: #f3f4f6;
}

.dropdown-item:focus {
  outline: none;
  background: #e5e7eb;
}
</style>
