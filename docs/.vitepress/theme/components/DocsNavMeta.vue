<script setup lang="ts">
import { docsShellConfig, useDocsPage } from "../composables/use-docs-page";

const { section } = useDocsPage();
</script>

<template>
  <div class="vf-docs-nav-meta">
    <span class="vf-docs-nav-meta__version">{{ docsShellConfig.version }}</span>
    <span class="vf-docs-nav-meta__section">{{ section.title }}</span>
  </div>
</template>
