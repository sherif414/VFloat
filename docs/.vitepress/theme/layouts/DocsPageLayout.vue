<script setup lang="ts">
import DefaultTheme from "vitepress/theme";
import { useDocsPage } from "../composables/use-docs-page";
import DocsAsideCard from "../components/frame/DocsAsideCard.vue";
import DocsPageHeader from "../components/frame/DocsPageHeader.vue";
import DocsSidebarCard from "../components/frame/DocsSidebarCard.vue";
import DocsTopbar from "../components/frame/DocsTopbar.vue";

const { pageShell } = useDocsPage();
</script>

<template>
  <div class="vf-docs-shell">
    <DefaultTheme.Layout id="vf-layout">
      <template v-if="pageShell.frame.topbar" #layout-top>
        <DocsTopbar />
      </template>

      <template v-if="pageShell.frame.sidebarCard" #sidebar-nav-before>
        <DocsSidebarCard />
      </template>

      <template v-if="pageShell.frame.pageHeader" #doc-before>
        <DocsPageHeader />
      </template>

      <template v-if="pageShell.frame.asideCard" #aside-top>
        <DocsAsideCard />
      </template>
    </DefaultTheme.Layout>
  </div>
</template>
