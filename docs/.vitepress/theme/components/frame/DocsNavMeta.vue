<script setup lang="ts">
import { useDocsPage } from "../../composables/use-docs-page";
import { docsShellConfig } from "../../config/docs-shell";

const { section } = useDocsPage();
</script>

<template>
  <div class="vf-docs-nav-meta">
    <span class="vf-docs-nav-meta__section">{{ section.title }}</span>
    <span class="vf-docs-nav-meta__version">{{ docsShellConfig.version }}</span>
  </div>
</template>
