<script setup lang="ts">
import { ref } from "vue";
import { useFloating } from "@/composables";

const props = withDefaults(defineProps<{
  placement: string
}>(), {
  placement: 'top'
})

const anchorEl = ref(null);
const floatingEl = ref(null);

const context = useFloating(anchorEl, floatingEl, {
  open: ref(true),
  placement: props.placement,
});

const showTooltip = () => {
  context.setOpen(true)
};

const hideTooltip = () => {
  context.setOpen(false)
};
</script>

<template>
  <button ref="anchorEl">
    Hover me
  </button>

  <div ref="floatingEl" :style="{ ...context.floatingStyles.value }">
    This is a tooltip positioned by V-Float
  </div>
</template>