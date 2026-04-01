<script setup lang="ts">
withDefaults(
  defineProps<{
    columns?: 2 | 3 | 4;
  }>(),
  {
    columns: 2,
  },
);
</script>

<template>
  <div class="vf-card-grid" :data-columns="columns">
    <slot />
  </div>
</template>
