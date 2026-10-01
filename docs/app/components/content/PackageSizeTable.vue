<script setup lang="ts">
interface Props {
  showDetails?: boolean;
}

withDefaults(defineProps<Props>(), {
  showDetails: false,
});

const config = useRuntimeConfig();
const packageSize = (config.public.packageSize ?? {
  version: "0.14.0",
  rawFormatted: "N/A",
  minifiedFormatted: "N/A",
  gzipFormatted: "~14.7 kB",
  brotliFormatted: "~13.2 kB",
}) as {
  version: string;
  rawFormatted: string;
  minifiedFormatted: string;
  gzipFormatted: string;
  brotliFormatted: string;
};
</script>

<template>
  <div class="flex flex-wrap items-center gap-2 my-5">
    <span
      class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted border border-default text-[13px] leading-tight transition-colors duration-200"
    >
      <span class="text-toned font-medium">Minified</span>
      <span class="font-mono font-semibold text-highlighted">{{
        packageSize.minifiedFormatted
      }}</span>
    </span>

    <span
      class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary text-[13px] leading-tight transition-colors duration-200"
    >
      <span class="size-1.5 rounded-full bg-primary" />
      <span class="text-primary font-semibold">Gzip</span>
      <span class="font-mono font-semibold text-primary">{{ packageSize.gzipFormatted }}</span>
    </span>

    <span
      class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted border border-default text-[13px] leading-tight transition-colors duration-200"
    >
      <span class="text-toned font-medium">Brotli</span>
      <span class="font-mono font-semibold text-highlighted">{{
        packageSize.brotliFormatted
      }}</span>
    </span>
  </div>
</template>
