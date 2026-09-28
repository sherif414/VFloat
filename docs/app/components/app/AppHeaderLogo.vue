<script setup lang="ts">
const appConfig = useAppConfig();
const site = useSiteConfig();

const title = appConfig.header?.title || site.name || "VFloat";
</script>

<template>
  <div class="flex items-center">
    <span
      class="text-base font-bold tracking-tight text-highlighted transition-opacity hover:opacity-80 select-none"
    >
      {{ title }}
    </span>
  </div>
</template>
