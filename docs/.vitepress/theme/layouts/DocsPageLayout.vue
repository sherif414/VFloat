<script setup lang="ts">
import DefaultTheme from "vitepress/theme";
import DocsPageHeader from "../components/DocsPageHeader.vue";
import { useDocsPage } from "../composables/use-docs-page";

const { pageShell } = useDocsPage();
</script>

<template>
  <div class="vf-docs-shell">
    <DefaultTheme.Layout id="vf-layout">
      <template v-if="pageShell.frame.pageHeader" #doc-before>
        <DocsPageHeader />
      </template>
    </DefaultTheme.Layout>
  </div>
</template>
