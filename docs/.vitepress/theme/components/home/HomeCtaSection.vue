<script setup lang="ts">
import type { HomeContent } from "../../config/home-content";

defineProps<{
  cta: HomeContent["cta"];
}>();
</script>

<template>
  <section class="vf-home__cta">
    <div class="vf-home__cta-crosshair vf-home__cta-crosshair--top" aria-hidden="true"></div>
    <div class="vf-home__cta-crosshair vf-home__cta-crosshair--bottom" aria-hidden="true"></div>

    <div class="vf-home__cta-inner">
      <h2>{{ cta.title }}</h2>
      <p>{{ cta.description }}</p>

      <div class="vf-home__cta-actions">
        <a class="vf-home__cta-button" :href="cta.primaryAction.href">{{
          cta.primaryAction.label
        }}</a>
        <div class="vf-home__install">
          <code>{{ cta.installCommand }}</code>
          <button class="vf-home__install-copy" type="button" aria-label="Copy install command">
            <span class="material-symbols-outlined">content_copy</span>
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
