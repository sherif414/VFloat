<script setup lang="ts">
import { useTemplateRef, watchEffect } from "vue";

const logger = (e: Event) => {
  console.log(e.type);
};

const button = useTemplateRef("button");
watchEffect(() => {
  const btn = button.value;
  if (!btn) return;

  btn.addEventListener("keydown", logger);
  btn.addEventListener("click", logger);
  btn.addEventListener("keyup", logger);
  btn.addEventListener("mousedown", logger);
  btn.addEventListener("pointerdown", logger);
});
</script>

<template>
  <div>
    <button ref="button">button</button>
  </div>
</template>
