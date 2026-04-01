<script setup lang="ts">
withDefaults(
  defineProps<{
    eyebrow?: string;
    title?: string;
    lead?: string;
  }>(),
  {
    eyebrow: undefined,
    title: undefined,
    lead: undefined,
  },
);
</script>

<template>
  <section class="vf-content-section">
    <header v-if="eyebrow || title || lead" class="vf-content-section__header">
      <p v-if="eyebrow" class="vf-content-section__eyebrow">{{ eyebrow }}</p>
      <h2 v-if="title" class="vf-content-section__title">{{ title }}</h2>
      <p v-if="lead" class="vf-content-section__lead">{{ lead }}</p>
    </header>

    <div class="vf-content-section__body">
      <slot />
    </div>
  </section>
</template>
