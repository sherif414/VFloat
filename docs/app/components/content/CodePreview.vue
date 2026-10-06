<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    title?: string;
    class?: any;
  }>(),
  {
    title: "Preview",
    class: undefined,
  },
);

const slots = defineSlots<{
  default?: () => any;
  code?: () => any;
}>();
</script>

<template>
  <div
    class="my-6 rounded-xl border border-(--vf-code-border) bg-muted/60 shadow-(--vf-elevation-code) overflow-hidden"
    :class="props.class"
  >
    <!-- Code block header -->
    <div
      class="flex items-center justify-between px-4 py-2 border-b border-(--vf-code-border) bg-muted/40 font-mono text-[12px] text-muted select-none"
    >
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-play" class="size-3.5 text-muted" />
        <span class="font-medium text-highlighted">{{ props.title }}</span>
      </div>

      <div class="flex items-center gap-1.5 text-[11px] text-muted">
        <span class="inline-block size-1.5 rounded-full bg-(--vf-tertiary)" />
        <span>Interactive</span>
      </div>
    </div>

    <!-- Preview canvas -->
    <div
      class="relative flex items-center justify-center p-6 sm:p-8 min-h-[130px] bg-muted/30 before:absolute before:inset-0 before:bg-[radial-gradient(circle,var(--ui-border)_1px,transparent_1px)] before:bg-[size:16px_16px] before:opacity-40 before:pointer-events-none"
    >
      <slot />
    </div>

    <!-- Code slot (if present) -->
    <div
      v-if="slots.code"
      class="border-t border-(--vf-code-border) [&>div>pre]:rounded-none [&>div>pre]:border-0 [&>div>pre]:shadow-none [&>div]:my-0"
    >
      <slot name="code" />
    </div>
  </div>
</template>
