<script setup lang="ts">
import { ref } from "vue"
import { useFloating, useDismiss } from "v-float"

const anchorEl = ref(null)
const floatingEl = ref(null)
const confirmationShown = ref(false)
const isOpen = ref(false)

const context = useFloating(anchorEl, floatingEl, {
  open: isOpen,
  setOpen: (value: boolean) => {
    // If trying to close and confirmation is needed
    if (!value && !confirmationShown.value) {
      confirmationShown.value = true
      return // Don't close yet
    }

    // Otherwise update the open state
    isOpen.value = value

    // Reset confirmation state when fully closed
    if (!value) {
      confirmationShown.value = false
    }
  },
})

// Custom dismiss behavior
useDismiss(context, {
  escapeKey: true,
  outsidePress: (event: MouseEvent | KeyboardEvent) => {
    // Only allow Escape key to show confirmation
    if (event instanceof KeyboardEvent && event.key === "Escape") {
      if (!confirmationShown.value) {
        confirmationShown.value = true
        return false // Prevent immediate closing
      }
    }

    // Prevent outside clicks from dismissing
    if (event.type.includes("mouse")) {
      return false
    }

    return true
  },
})

// Handle confirmation
function confirmClose() {
  context.setOpen(false)
  confirmationShown.value = false
}

function cancelClose() {
  confirmationShown.value = false
}
</script>

<template>
  <div>
    <button ref="anchorEl" @click="context.setOpen(!context.open.value)">Open Modal</button>

    <div
      ref="floatingEl"
      :style="context.floatingStyles.value"
      class="modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div class="modal-header">
        <h2 id="modal-title">Important Form</h2>
        <button @click="confirmationShown = true" class="close-button">×</button>
      </div>

      <div class="modal-body" v-if="!confirmationShown">
        <p>This is a modal with controlled dismissal.</p>
        <p>Try pressing Escape or clicking the X button.</p>
        <form class="example-form">
          <div class="form-group">
            <label for="name">Name:</label>
            <input id="name" type="text" />
          </div>
          <div class="form-group">
            <label for="email">Email:</label>
            <input id="email" type="email" />
          </div>
        </form>
      </div>

      <!-- Confirmation dialog -->
      <div v-if="confirmationShown" class="confirmation">
        <p>Are you sure you want to close this form? Any unsaved changes will be lost.</p>
        <div class="button-group">
          <button @click="cancelClose" class="cancel-button">No, keep editing</button>
          <button @click="confirmClose" class="confirm-button">Yes, close</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  width: 90%;
  max-width: 500px;
  margin: 50px auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
}

.modal-body {
  padding: 20px;
}

.close-button {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
}

.example-form {
  margin-top: 20px;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
}

.form-group input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.confirmation {
  padding: 20px;
  text-align: center;
}

.button-group {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 15px;
}

.cancel-button {
  padding: 8px 16px;
  background: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
}

.confirm-button {
  padding: 8px 16px;
  background: #4a90e2;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
</style>
