<script setup lang="ts">
import type { HomeContent } from "../../config/home-content";

defineProps<{
  behaviors: HomeContent["behaviors"];
}>();
</script>

<template>
  <section class="vf-home__behaviors">
    <div class="vf-home__section-inner">
      <div class="vf-home__section-header">
        <h2>{{ behaviors.title }}</h2>
        <div class="vf-home__section-rule"></div>
      </div>

      <div class="vf-home__behavior-grid">
        <article v-for="card in behaviors.cards" :key="card.title" class="vf-home__behavior-card">
          <div class="vf-home__behavior-visual" :data-variant="card.variant">
            <div v-if="card.variant !== 'boundary'" class="vf-home__behavior-anchor"></div>
            <template v-if="card.variant === 'shift'">
              <div class="vf-home__behavior-shift-box">
                <span class="material-symbols-outlined">{{ card.icon }}</span>
              </div>
              <div class="vf-home__behavior-axis"></div>
            </template>
            <template v-else-if="card.variant === 'flip'">
              <div class="vf-home__behavior-flip-box">
                <span class="material-symbols-outlined">{{ card.icon }}</span>
              </div>
            </template>
            <template v-else-if="card.variant === 'offset'">
              <div class="vf-home__behavior-offset-box">
                <span class="material-symbols-outlined">{{ card.icon }}</span>
              </div>
            </template>
            <template v-else>
              <div class="vf-home__behavior-boundary-zone"></div>
              <div class="vf-home__behavior-boundary-box"></div>
              <span class="vf-home__behavior-boundary-label">CLIPPING_ZONE</span>
            </template>
          </div>
          <h3>{{ card.title }}</h3>
          <p>{{ card.description }}</p>
        </article>
      </div>
    </div>
  </section>
</template>
