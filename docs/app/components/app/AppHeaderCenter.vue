<script setup lang="ts">
import { computed } from "vue";

const route = useRoute();
const { localePath } = useDocusI18n();

const isLandingPage = computed(() => route.path === "/" || route.path === "");
</script>

<template>
  <div class="flex items-center justify-between gap-4 w-full">
    <!-- Desktop Navigation Links on Landing Page -->
    <nav v-if="isLandingPage" class="hidden md:flex items-center gap-1">
      <NuxtLink
        :to="localePath('/guide')"
        class="px-3 py-1.5 text-sm font-medium rounded-md text-muted hover:text-highlighted hover:bg-elevated/60 transition-colors whitespace-nowrap"
      >
        Guide
      </NuxtLink>
      <NuxtLink
        :to="localePath('/api')"
        class="px-3 py-1.5 text-sm font-medium rounded-md text-muted hover:text-highlighted hover:bg-elevated/60 transition-colors whitespace-nowrap"
      >
        API Reference
      </NuxtLink>
    </nav>

    <!-- Search Button -->
    <div class="w-full" :class="{ 'md:max-w-xs md:ml-auto': isLandingPage }">
      <UContentSearchButton
        :collapsed="false"
        class="w-full"
        variant="soft"
        :ui="{
          leadingIcon: 'size-4 mx-0.5',
        }"
      />
    </div>
  </div>
</template>
