<script setup lang="ts">
import { useData } from "vitepress";
import { useDocsPage } from "../../composables/use-docs-page";

const { page } = useData();
const { pageDescription, section } = useDocsPage();
</script>

<template>
  <header class="vf-docs-page-head">
    <p class="vf-docs-page-head__crumb">{{ section.title }} <span>/</span> {{ page.title }}</p>
    <h1>{{ page.title }}</h1>
    <p class="vf-docs-page-head__description">{{ pageDescription }}</p>
  </header>
</template>
