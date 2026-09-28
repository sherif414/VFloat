<script setup lang="ts">
const appConfig = useAppConfig();
const site = useSiteConfig();

const title = appConfig.header?.title || site.name || "VFloat";
</script>

<template>
  <div class="flex items-center gap-2.5 font-bold tracking-tight text-highlighted">
    <img src="/vfloat-mark.svg" :alt="title" class="h-6 w-auto shrink-0" />
    <span class="text-base font-bold tracking-tight text-highlighted">{{ title }}</span>
  </div>
</template>
