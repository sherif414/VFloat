<script setup lang="ts">
const currentYear = new Date().getFullYear();
</script>

<template>
  <footer class="border-t border-default py-6 text-sm text-muted">
    <div class="w-full max-w-(--ui-container) mx-auto px-4 sm:px-6 lg:px-8 text-center">
      <p class="text-xs sm:text-sm text-muted">
        Released under the MIT License. Copyright © {{ currentYear }}
      </p>
    </div>
  </footer>
</template>
