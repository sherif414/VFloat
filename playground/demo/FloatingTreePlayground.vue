<script setup lang="ts">
import FloatingTreeHoverDemo from "./FloatingTreeHoverDemo.vue";
import FloatingTreeKeyboardDemo from "./FloatingTreeKeyboardDemo.vue";
import FloatingTreeMenuDemo from "./FloatingTreeMenuDemo.vue";
import FloatingTreeProvideInjectDemo from "./FloatingTreeProvideInjectDemo.vue";
</script>

<template>
  <main class="playground">
    <FloatingTreeHoverDemo />
    <FloatingTreeKeyboardDemo />
    <FloatingTreeMenuDemo />
    <FloatingTreeProvideInjectDemo />
  </main>
</template>

<style scoped>
.playground {
  min-height: 100vh;
  padding: 18px;
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 18px;
  background:
    radial-gradient(circle at top right, rgba(16, 185, 129, 0.12), transparent 30%),
    radial-gradient(circle at top left, rgba(6, 182, 212, 0.1), transparent 26%),
    linear-gradient(180deg, #f2f7f6 0%, #f7fbfa 48%, #f2f7f6 100%);
  color: #183938;
  font-family: "Aptos", "Segoe UI Variable Text", sans-serif;
}

@media (max-width: 640px) {
  .playground {
    padding: 12px;
  }
}
</style>
