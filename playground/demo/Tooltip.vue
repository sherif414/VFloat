<script setup lang="ts">
import { ref } from "vue";
import { useFloating, useHover, type Placement } from "@/composables";

const props = withDefaults(defineProps<{
  placement: Placement
}>(), {
  placement: 'top'
})

const anchorEl = ref(null);
const floatingEl = ref(null);

const context = useFloating(anchorEl, floatingEl, {
  open: ref(true),
  placement: props.placement,
});

useHover(context)
</script>

<template>
  <button ref="anchorEl">
    Hover me
  </button>

  <div v-if="context.open.value" ref="floatingEl" :style="context.floatingStyles.value">
    This is a tooltip positioned by V-Float
  </div>
</template>