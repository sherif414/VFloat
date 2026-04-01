<script setup lang="ts">
import type { HomeContent } from "../../config/home-content";

defineProps<{
  footer: HomeContent["footer"];
}>();
</script>

<template>
  <footer class="vf-home__footer">
    <div class="vf-home__footer-inner">
      <div class="vf-home__footer-copy">
        {{ footer.copy }}
      </div>
      <div class="vf-home__footer-links">
        <span v-for="item in footer.items" :key="item.label" class="vf-home__footer-link">
          {{ item.label }}
        </span>
      </div>
    </div>
  </footer>
</template>
