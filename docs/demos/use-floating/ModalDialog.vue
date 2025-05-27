<script setup lang="ts">
import { ref, nextTick, watch } from "vue"
import { useFloating, offset } from "v-float"

const anchorEl = ref<HTMLElement | null>(null)
const floatingEl = ref<HTMLElement | null>(null)
const isOpen = ref(false)
const firstFocusableEl = ref<HTMLElement | null>(null)

const { floatingStyles } = useFloating(anchorEl, floatingEl, {
  placement: "top",
  strategy: "fixed",
  open: isOpen,
  middlewares: [offset(0)],
  transform: false,
})

const openModal = () => {
  isOpen.value = true
}

const closeModal = () => {
  isOpen.value = false
}

const handleBackdropClick = (event: MouseEvent) => {
  if (event.target === event.currentTarget) {
    closeModal()
  }
}

const handleEscape = (event: KeyboardEvent) => {
  if (event.key === "Escape") {
    closeModal()
  }
}

// Focus management
watch(isOpen, async (open) => {
  if (open) {
    await nextTick()
    firstFocusableEl.value?.focus()
    document.addEventListener("keydown", handleEscape)
  } else {
    document.removeEventListener("keydown", handleEscape)
    anchorEl.value?.focus()
  }
})
</script>

<template>
  <div class="modal-container">
    <button ref="anchorEl" @click="openModal" class="modal-trigger">Open Modal</button>

    <!-- Modal backdrop -->
    <Teleport to="body">
      <div v-if="isOpen" class="modal-backdrop" @click="handleBackdropClick">
        <div
          ref="floatingEl"
          class="modal-content"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div class="modal-header">
            <h2 id="modal-title" class="modal-title">Modal Title</h2>
            <button @click="closeModal" class="modal-close" aria-label="Close modal">×</button>
          </div>

          <div class="modal-body">
            <p>This is a modal dialog example using useFloating.</p>
            <p>It demonstrates:</p>
            <ul>
              <li>Fixed positioning strategy</li>
              <li>Focus management</li>
              <li>Keyboard navigation (ESC to close)</li>
              <li>Backdrop click to close</li>
            </ul>

            <div class="modal-actions">
              <button ref="firstFocusableEl" @click="closeModal" class="btn btn-primary">
                Confirm
              </button>
              <button @click="closeModal" class="btn btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.modal-container {
  display: flex;
  justify-content: center;
  padding: 2rem;
}

.modal-trigger {
  padding: 12px 24px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  transition: background 0.2s;
}

.modal-trigger:hover {
  background: #2563eb;
}

.modal-trigger:focus {
  outline: 2px solid #93c5fd;
  outline-offset: 2px;
}

.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(2px);
}

.modal-content {
  background: white;
  border-radius: 8px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  max-width: 500px;
  width: 90vw;
  max-height: 90vh;
  overflow: auto;
  animation: modalFadeIn 0.2s ease-out;
}

@keyframes modalFadeIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
}

.modal-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #111827;
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  padding: 4px;
  line-height: 1;
  color: #6b7280;
  transition: color 0.2s;
}

.modal-close:hover {
  color: #1f2937;
}

.modal-body {
  padding: 20px 24px 24px;
  color: #4b5563;
  line-height: 1.6;
}

.modal-body p {
  margin: 0 0 16px 0;
}

.modal-body ul {
  margin: 0 0 24px 0;
  padding-left: 20px;
}

.modal-body li {
  margin-bottom: 8px;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover {
  background: #2563eb;
}

.btn-primary:focus {
  outline: 2px solid #93c5fd;
  outline-offset: 2px;
}

.btn-secondary {
  background: #f3f4f6;
  color: #1f2937;
}

.btn-secondary:hover {
  background: #e5e7eb;
}

.btn-secondary:focus {
  outline: 2px solid #d1d5db;
  outline-offset: 2px;
}
</style>
