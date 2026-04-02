<script setup lang="ts">
import { useDocsPage } from "../../composables/use-docs-page";

const { pagePathLabel, section } = useDocsPage();
</script>

<template>
  <div aria-hidden="true" class="vf-docs-ornaments">
    <div class="vf-docs-ornament vf-docs-ornament--top">
      <span class="vf-docs-ornament__corner" />
      <span class="vf-docs-ornament__label">{{ pagePathLabel }}</span>
    </div>
    <div class="vf-docs-ornament vf-docs-ornament--bottom">
      <span class="vf-docs-ornament__label">{{ section.label }}</span>
      <span class="vf-docs-ornament__corner" />
    </div>
  </div>
</template>
