<script setup lang="ts">
import { computed } from "vue";
import { useDocsPage } from "../composables/use-docs-page";
import DocsPageLayout from "./DocsPageLayout.vue";
import LandingPageLayout from "./LandingPageLayout.vue";

const { pageShell } = useDocsPage();

const isLandingPage = computed(() => pageShell.value.template === "landing");
</script>

<template>
  <LandingPageLayout v-if="isLandingPage" />
  <DocsPageLayout v-else />
</template>
