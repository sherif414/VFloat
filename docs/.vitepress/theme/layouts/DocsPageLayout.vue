<script setup lang="ts">
import DefaultTheme from "vitepress/theme";
import DocsNavMeta from "../components/frame/DocsNavMeta.vue";
import DocsPageHeader from "../components/frame/DocsPageHeader.vue";
import DocsSidebarCard from "../components/frame/DocsSidebarCard.vue";
import DocsTopbar from "../components/frame/DocsTopbar.vue";
import { useDocsPage } from "../composables/use-docs-page";

const { pageShell } = useDocsPage();
</script>

<template>
  <div class="vf-docs-shell">
    <DefaultTheme.Layout id="vf-layout">
      <template v-if="pageShell.frame.topbar" #layout-top>
        <DocsTopbar />
      </template>

      <template #nav-bar-content-after>
        <DocsNavMeta />
      </template>

      <template v-if="pageShell.frame.sidebarCard" #sidebar-nav-before>
        <DocsSidebarCard />
      </template>

      <template v-if="pageShell.frame.pageHeader" #doc-before>
        <DocsPageHeader />
      </template>
    </DefaultTheme.Layout>
  </div>
</template>
