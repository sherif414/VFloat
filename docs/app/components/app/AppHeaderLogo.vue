<script setup lang="ts">
const appConfig = useAppConfig();
const site = useSiteConfig();

const title = appConfig.header?.title || site.name || "VFloat";
</script>

<template>
  <div class="flex items-center gap-2 transition-opacity hover:opacity-80 select-none">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      fill="currentColor"
      aria-hidden="true"
      class="size-5 shrink-0 text-highlighted"
    >
      <path
        d="M 79.05 54.07 L 81.38 39.76 A 20.5 20.5 0 0 1 100.23 22.6 L 199.11 15.91 A 21 21 0 0 1 210.38 18.32 L 150.46 90.07 A 166.5 166.5 0 0 0 79.05 54.07 Z M 217.05 23.9 A 21 21 0 0 1 221.48 35.38 L 228.46 134.01 A 23 23 0 0 1 213.17 157.33 L 199.42 162.18 A 166.5 166.5 0 0 0 156.91 95.91 L 217.05 23.9 Z M 60.3 198.05 A 16.8 16.8 0 0 1 57.56 185.83 L 77.6 62.98 A 157.5 157.5 0 0 1 144.69 96.98 L 60.3 198.05 Z M 151.13 102.84 A 157.5 157.5 0 0 1 190.93 165.17 L 79.73 204.38 A 16.8 16.8 0 0 1 66.91 203.7 L 151.13 102.84 Z M 27.7 226.1 A 15.3 15.3 0 1 0 58.3 226.1 A 15.3 15.3 0 1 0 27.7 226.1 Z"
      />
    </svg>
    <span class="text-base font-bold tracking-tight text-highlighted">
      {{ title }}
    </span>
  </div>
</template>
