<script setup lang="ts">
import type { HomeContent } from "../../config/home-content";

defineProps<{
  metrics: HomeContent["metrics"];
}>();
</script>

<template>
  <section class="vf-home__metrics">
    <div class="vf-home__metrics-layout">
      <div class="vf-home__metrics-copy">
        <h2>{{ metrics.title }}</h2>
        <p>{{ metrics.description }}</p>
        <div class="vf-home__checks">
          <div v-for="check in metrics.checks" :key="check" class="vf-home__check">
            <span class="material-symbols-outlined">check_circle</span>
            <span>{{ check }}</span>
          </div>
        </div>
      </div>

      <div class="vf-home__metric-grid">
        <article v-for="metric in metrics.cards" :key="metric.id" class="vf-home__metric-card">
          <span class="vf-home__metric-id">{{ metric.id }}</span>
          <div class="vf-home__metric-value">{{ metric.value }}</div>
          <div class="vf-home__metric-label">{{ metric.label }}</div>
          <p>{{ metric.description }}</p>
        </article>
      </div>
    </div>
  </section>
</template>
