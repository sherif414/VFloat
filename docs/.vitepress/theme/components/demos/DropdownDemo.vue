<template>
  <div class="demo-preview">
    <div class="dropdown-demo">
      <button ref="dropdownTrigger" class="demo-button">
        Click me <span class="arrow">↓</span>
      </button>
      <Teleport to="body">
        <div
          v-show="dropdownContext.isPositioned.value"
          ref="dropdownFloating"
          class="dropdown floating-element"
          :style="dropdownContext.floatingStyles.value"
        >
          <div class="dropdown-item">Edit profile</div>
          <div class="dropdown-item">Settings</div>
          <div class="dropdown-item">Sign out</div>
        </div>
      </Teleport>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTemplateRef } from "vue";
import { useFloating, useClick, useDismiss, offset } from "v-float";

const dropdownTrigger = useTemplateRef("dropdownTrigger");
const dropdownFloating = useTemplateRef("dropdownFloating");

const dropdownContext = useFloating(dropdownTrigger, dropdownFloating, {
  placement: "bottom-start",
  middlewares: [offset(4)],
});

useClick(dropdownContext);
useDismiss(dropdownContext);
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

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(8px) translateX(-50%);
  }

  to {
    opacity: 1;
    transform: translateY(0) translateX(-50%);
  }
}

.dropdown {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  overflow: hidden;
  min-width: 160px;
}

.dropdown-item {
  padding: 0.75rem 1rem;
  color: var(--vp-c-text-1);
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.dropdown-item:hover {
  background: var(--vp-c-bg-soft);
}

.arrow {
  font-size: 0.75rem;
  transition: transform 0.2s ease;
}

.demo-button:hover .arrow {
  transform: translateY(2px);
}
</style>