<script setup lang="ts">
import { provideFloatingTree, useFloatingTree } from "../../src";
import FloatingTreeProvideSurface from "./FloatingTreeProvideSurface.vue";

const tree = provideFloatingTree(useFloatingTree({ id: "playground-tree-provided" }));
</script>

<template>
  <section class="demo-shell">
    <FloatingTreeProvideSurface />
  </section>
</template>

<style scoped>
.demo-shell {
  width: min(100%, 30rem);
}
</style>
