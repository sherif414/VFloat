<script setup lang="ts">
import DefaultTheme from "vitepress/theme";
import { useDocsPage } from "../composables/use-docs-page";
import DocsAsideCard from "../components/chrome/DocsAsideCard.vue";
import DocsPageHeader from "../components/chrome/DocsPageHeader.vue";
import DocsSidebarCard from "../components/chrome/DocsSidebarCard.vue";
import DocsTopbar from "../components/chrome/DocsTopbar.vue";

const { pageShell } = useDocsPage();
</script>

<template>
  <div class="vf-docs-shell">
    <DefaultTheme.Layout id="vf-layout">
      <template v-if="pageShell.chrome.topbar" #layout-top>
        <DocsTopbar />
      </template>

      <template v-if="pageShell.chrome.sidebarCard" #sidebar-nav-before>
        <DocsSidebarCard />
      </template>

      <template v-if="pageShell.chrome.pageHeader" #doc-before>
        <DocsPageHeader />
      </template>

      <template v-if="pageShell.chrome.asideCard" #aside-top>
        <DocsAsideCard />
      </template>
    </DefaultTheme.Layout>
  </div>
</template>
