<script setup lang="ts">
import { homeContent } from "../../config/home-content";
import HomeBehaviorsSection from "./HomeBehaviorsSection.vue";
import HomeCtaSection from "./HomeCtaSection.vue";
import HomeFooter from "./HomeFooter.vue";
import HomeHeroSection from "./HomeHeroSection.vue";
import HomeMetricsSection from "./HomeMetricsSection.vue";
import HomeNav from "./HomeNav.vue";
</script>

<template>
  <div class="vf-home">
    <HomeNav
      :nav-items="homeContent.navItems"
      :package-version="homeContent.packageVersion"
      :repo-url="homeContent.repoUrl"
    />

    <main class="vf-home__main">
      <HomeHeroSection :hero="homeContent.hero" :matrix-controls="homeContent.matrixControls" />
      <HomeBehaviorsSection :behaviors="homeContent.behaviors" />
      <HomeMetricsSection :metrics="homeContent.metrics" />
      <HomeCtaSection :cta="homeContent.cta" />
    </main>

    <HomeFooter :footer="homeContent.footer" />
  </div>
</template>
